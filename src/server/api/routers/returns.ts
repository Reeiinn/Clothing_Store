import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ReturnReason, ReturnStatus } from "../../../../generated/prisma";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  activeReturnItems,
  getReturnWindowEndsAt,
  returnBlockReason,
  returnedQty,
} from "~/server/return-policy";
import { restock } from "~/server/stock";

const returnStatusSchema = z.nativeEnum(ReturnStatus);

const pageSize = 20;

export const returnsRouter = createTRPCRouter({
  eligibility: protectedProcedure
    .input(z.object({ orderNumber: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          number: input.orderNumber,
          userId: ctx.session.user.id,
        },
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              colorName: true,
              size: true,
              quantity: true,
              variant: { select: { product: { select: { imageUrl: true } } } },
              returnItems: activeReturnItems,
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      const items = order.items.map((item) => {
        const alreadyReturnedQty = returnedQty(item);
        return {
          orderItemId: item.id,
          productName: item.productName,
          colorName: item.colorName,
          imageUrl: item.variant.product.imageUrl,
          size: item.size,
          boughtQty: item.quantity,
          alreadyReturnedQty,
          returnableQty: Math.max(0, item.quantity - alreadyReturnedQty),
        };
      });

      const reason =
        returnBlockReason(order) ??
        (items.some((item) => item.returnableQty > 0)
          ? undefined
          : "No items remain eligible for return.");

      return {
        eligible: !reason,
        ...(reason ? { reason } : {}),
        returnWindowEndsAt: getReturnWindowEndsAt(order.deliveredAt),
        items,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        orderNumber: z.number().int().positive(),
        items: z
          .array(
            z.object({
              orderItemId: z.string().min(1),
              quantity: z.number().int().min(1),
              reason: z.nativeEnum(ReturnReason),
            }),
          )
          .min(1, "Select at least one item to return")
          .refine(
            (items) =>
              new Set(items.map((item) => item.orderItemId)).size ===
              items.length,
            "Each order item can only appear once",
          ),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        const lockedOrders = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "Order"
          WHERE "number" = ${input.orderNumber} AND "userId" = ${userId}
          FOR UPDATE
        `;

        if (!lockedOrders[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        const order = await tx.order.findUniqueOrThrow({
          where: { id: lockedOrders[0].id },
          include: {
            items: {
              select: {
                id: true,
                quantity: true,
                unitPriceCents: true,
                returnItems: activeReturnItems,
              },
            },
          },
        });

        const blocked = returnBlockReason(order);
        if (blocked) {
          throw new TRPCError({ code: "BAD_REQUEST", message: blocked });
        }

        let estimatedRefundCents = 0;
        for (const requested of input.items) {
          const orderItem = order.items.find(
            (item) => item.id === requested.orderItemId,
          );

          if (!orderItem) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A selected item does not belong to this order.",
            });
          }

          const returnableQty = orderItem.quantity - returnedQty(orderItem);
          if (requested.quantity > returnableQty) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Only ${Math.max(0, returnableQty)} more of this item can be returned.`,
            });
          }

          estimatedRefundCents += orderItem.unitPriceCents * requested.quantity;
        }

        const request = await tx.returnRequest.create({
          data: {
            orderId: order.id,
            note: input.note,
            items: { create: input.items },
          },
          select: { id: true },
        });

        return { id: request.id, estimatedRefundCents };
      });
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.returnRequest.findMany({
      where: { order: { userId: ctx.session.user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { number: true } },
        items: {
          include: {
            orderItem: {
              select: {
                productName: true,
                colorName: true,
                size: true,
                unitPriceCents: true,
              },
            },
          },
        },
      },
    });
  }),

  adminList: adminProcedure
    .input(
      z.object({
        status: returnStatusSchema.optional(),
        page: z.number().int().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.status ? { status: input.status } : {};
      const [requests, total] = await Promise.all([
        ctx.db.returnRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * pageSize,
          take: pageSize,
          include: {
            order: {
              select: {
                number: true,
                user: { select: { name: true, email: true } },
              },
            },
            items: {
              include: {
                orderItem: {
                  select: {
                    productName: true,
                    colorName: true,
                    size: true,
                    unitPriceCents: true,
                  },
                },
              },
            },
          },
        }),
        ctx.db.returnRequest.count({ where }),
      ]);

      return { requests, total, page: input.page, pageSize };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: returnStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        const request = await tx.returnRequest.findUnique({
          where: { id: input.id },
          include: {
            items: {
              select: {
                quantity: true,
                orderItem: { select: { variantId: true } },
              },
            },
          },
        });

        if (!request) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Return request not found.",
          });
        }

        const allowed =
          (request.status === "REQUESTED" &&
            (input.status === "APPROVED" || input.status === "REJECTED")) ||
          (request.status === "APPROVED" && input.status === "RECEIVED");

        if (!allowed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot move a return from ${request.status} to ${input.status}.`,
          });
        }

        const changed = await tx.returnRequest.updateMany({
          where: { id: request.id, status: request.status },
          data: { status: input.status },
        });

        if (changed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The return status changed; reload and try again.",
          });
        }

        if (input.status === "RECEIVED") {
          await restock(
            tx,
            request.items.map((item) => ({
              variantId: item.orderItem.variantId,
              quantity: item.quantity,
            })),
          );
        }
      });

      return { success: true };
    }),
});
