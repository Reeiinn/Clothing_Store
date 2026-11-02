import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

const returnStatus = z.enum(["REQUESTED", "APPROVED", "RECEIVED", "REJECTED"]);

export const returnsRouter = createTRPCRouter({
  /** Return requests for one status tab, newest first. */
  adminList: adminProcedure
    .input(z.object({ status: returnStatus }))
    .query(async ({ ctx, input }) => {
      const requests = await ctx.db.returnRequest.findMany({
        where: { status: input.status },
        orderBy: { createdAt: "desc" },
        include: {
          order: { select: { number: true } },
          user: { select: { name: true, email: true } },
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

      return requests.map((request) => ({
        ...request,
        estimatedRefundCents: request.items.reduce(
          (sum, item) => sum + item.orderItem.unitPriceCents * item.quantity,
          0,
        ),
      }));
    }),

  /**
   * REQUESTED -> APPROVED or REJECTED
   * APPROVED  -> RECEIVED (items go back into stock)
   */
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  getReturnWindowEndsAt,
  isWithinReturnWindow,
} from "~/server/return-policy";

const returnReasonSchema = z.enum([
  "SIZE_DIDNT_FIT",
  "NOT_AS_PICTURED",
  "DAMAGED",
  "WRONG_ITEM",
  "CHANGED_MIND",
  "OTHER",
]);

const returnStatusSchema = z.enum([
  "REQUESTED",
  "APPROVED",
  "RECEIVED",
  "REJECTED",
]);

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
              returnItems: {
                where: {
                  returnRequest: { status: { not: "REJECTED" } },
                },
                select: { quantity: true },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      const items = order.items.map((item) => {
        const alreadyReturnedQty = item.returnItems.reduce(
          (sum, returned) => sum + returned.quantity,
          0,
        );

        return {
          orderItemId: item.id,
          productName: item.productName,
          colorName: item.colorName,
          size: item.size,
          boughtQty: item.quantity,
          alreadyReturnedQty,
          returnableQty: Math.max(0, item.quantity - alreadyReturnedQty),
        };
      });

      const withinWindow = isWithinReturnWindow(order.deliveredAt);
      const eligible =
        order.status === "DELIVERED" &&
        withinWindow &&
        items.some((item) => item.returnableQty > 0);

      const reason = !eligible
        ? order.status !== "DELIVERED"
          ? "Only delivered orders can be returned."
          : !withinWindow
            ? "The 30-day return window has expired."
            : "No items remain eligible for return."
        : undefined;

      return {
        eligible,
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
              reason: returnReasonSchema,
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
        // Serialize return requests for an order before checking quantities.
        const lockedOrders = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "Order"
          WHERE "number" = ${input.orderNumber} AND "userId" = ${userId}
          FOR UPDATE
        `;

        if (lockedOrders.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        const order = await tx.order.findFirst({
          where: { number: input.orderNumber, userId },
          include: {
            items: {
              select: {
                id: true,
                quantity: true,
                unitPriceCents: true,
              },
            },
          },
        });

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }
        if (order.status !== "DELIVERED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only delivered orders can be returned.",
          });
        }
        if (!isWithinReturnWindow(order.deliveredAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The 30-day return window has expired.",
          });
        }

        let estimatedRefundCents = 0;
        const createItems: {
          orderItemId: string;
          quantity: number;
          reason: z.infer<typeof returnReasonSchema>;
        }[] = [];

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

          const returned = await tx.returnItem.aggregate({
            where: {
              orderItemId: orderItem.id,
              returnRequest: { status: { not: "REJECTED" } },
            },
            _sum: { quantity: true },
          });
          const returnableQty =
            orderItem.quantity - (returned._sum.quantity ?? 0);

          if (requested.quantity > returnableQty) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Only ${Math.max(0, returnableQty)} more of this item can be returned.`,
            });
          }

          estimatedRefundCents +=
            orderItem.unitPriceCents * requested.quantity;
          createItems.push({
            orderItemId: orderItem.id,
            quantity: requested.quantity,
            reason: requested.reason,
          });
        }

        const request = await tx.returnRequest.create({
          data: {
            orderId: order.id,
            userId,
            note: input.note,
            items: { create: createItems },
          },
          select: { id: true },
        });

        return { id: request.id, estimatedRefundCents };
      });
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.returnRequest.findMany({
      where: { userId: ctx.session.user.id },
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
            user: { select: { name: true, email: true } },
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
        status: z.enum(["APPROVED", "REJECTED", "RECEIVED"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const request = await tx.returnRequest.findUnique({
          where: { id: input.id },
          include: {
            items: { include: { orderItem: { select: { variantId: true } } } },
          },
        });
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

        const allowedFrom =
          input.status === "RECEIVED" ? "APPROVED" : "REQUESTED";
        if (request.status !== allowedFrom) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This return is ${request.status}, so it can't be marked ${input.status}.`,
          });
        }

        // Guard on the current status so stock can only be added back once.
        const moved = await tx.returnRequest.updateMany({
          where: { id: request.id, status: allowedFrom },
          data: { status: input.status },
        });
        if (moved.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This return was just updated by someone else. Refresh.",
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
          for (const item of request.items) {
            await tx.variant.update({
              where: { id: item.orderItem.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        return { id: request.id, status: input.status };
      });
    }),
});
      });

      return { success: true };
    }),
});
