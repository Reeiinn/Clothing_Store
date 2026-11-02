import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  getReturnWindowEndsAt,
  isWithinReturnWindow,
} from "~/server/return-policy";
import { deliveryOptions } from "~/server/shipping";

const orderStatusSchema = z.enum([
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

const pageSize = 20;

function canReturnOrder(
  status: string,
  deliveredAt: Date | null,
  items: {
    quantity: number;
    returnItems: { quantity: number }[];
  }[],
) {
  return (
    status === "DELIVERED" &&
    isWithinReturnWindow(deliveredAt) &&
    items.some(
      (item) =>
        item.quantity -
          item.returnItems.reduce(
            (sum, returnedItem) => sum + returnedItem.quantity,
            0,
          ) >
        0,
    )
  );
}

export const orderRouter = createTRPCRouter({
  listMine: protectedProcedure
    .input(z.object({ status: orderStatusSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          number: true,
          createdAt: true,
          status: true,
          totalCents: true,
          deliveredAt: true,
          items: {
            select: {
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

      return orders.map((order) => ({
        orderNumber: order.number,
        createdAt: order.createdAt,
        status: order.status,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCents: order.totalCents,
        canRequestReturn: canReturnOrder(
          order.status,
          order.deliveredAt,
          order.items,
        ),
      }));
    }),

  byNumber: protectedProcedure
    .input(z.object({ orderNumber: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          number: input.orderNumber,
          userId: ctx.session.user.id,
        },
        include: {
          items: {
            include: {
              returnItems: {
                where: {
                  returnRequest: { status: { not: "REJECTED" } },
                },
                select: { quantity: true },
              },
            },
          },
          history: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      const maxDays =
        order.shippingMethod === "STANDARD"
          ? deliveryOptions[0].maxDays
          : deliveryOptions[1].days;

      return {
        ...order,
        estimatedDelivery: new Date(
          order.createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000,
        ),
        canRequestReturn: canReturnOrder(
          order.status,
          order.deliveredAt,
          order.items,
        ),
        returnWindowEndsAt: getReturnWindowEndsAt(order.deliveredAt),
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ orderNumber: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            number: input.orderNumber,
            userId: ctx.session.user.id,
          },
          include: {
            items: { select: { variantId: true, quantity: true } },
          },
        });

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }
        if (order.status !== "PROCESSING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only processing orders can be cancelled.",
          });
        }

        const changed = await tx.order.updateMany({
          where: { id: order.id, status: "PROCESSING" },
          data: { status: "CANCELLED" },
        });

        if (changed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This order can no longer be cancelled.",
          });
        }

        for (const item of order.items) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            note: "Cancelled by customer",
          },
        });
      });

      return { success: true };
    }),

  adminList: adminProcedure
    .input(
      z.object({
        status: orderStatusSchema.optional(),
        page: z.number().int().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.status ? { status: input.status } : {};
      const [orders, total] = await Promise.all([
        ctx.db.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * pageSize,
          take: pageSize,
          select: {
            number: true,
            status: true,
            totalCents: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            items: { select: { quantity: true } },
          },
        }),
        ctx.db.order.count({ where }),
      ]);

      return { orders, total, page: input.page, pageSize };
    }),

  adminGet: adminProcedure
    .input(z.object({ orderNumber: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { number: input.orderNumber },
        include: {
          user: { select: { name: true, email: true } },
          items: true,
          history: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      return order;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        orderNumber: z.number().int().positive(),
        status: orderStatusSchema,
        trackingNumber: z.string().trim().min(1).max(100).optional(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { number: input.orderNumber },
          include: {
            items: { select: { variantId: true, quantity: true } },
          },
        });

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        const allowed =
          (order.status === "PROCESSING" &&
            (input.status === "SHIPPED" || input.status === "CANCELLED")) ||
          (order.status === "SHIPPED" && input.status === "DELIVERED");

        if (!allowed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot move an order from ${order.status} to ${input.status}.`,
          });
        }
        if (input.status === "SHIPPED" && !input.trackingNumber) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A tracking number is required when shipping an order.",
          });
        }

        const changed = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: {
            status: input.status,
            ...(input.status === "SHIPPED"
              ? {
                  trackingNumber: input.trackingNumber,
                  shippedAt: new Date(),
                }
              : {}),
            ...(input.status === "DELIVERED"
              ? { deliveredAt: new Date() }
              : {}),
          },
        });

        if (changed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The order status changed; reload and try again.",
          });
        }

        if (input.status === "CANCELLED") {
          for (const item of order.items) {
            await tx.variant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        const statusNote =
          input.status === "SHIPPED"
            ? `Shipped — handed to courier · Tracking no. ${input.trackingNumber}`
            : input.status === "DELIVERED"
              ? "Delivered"
              : "Cancelled";

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: input.status,
            note: input.note
              ? `${statusNote} · ${input.note}`
              : statusNote,
          },
        });
      });

      return { success: true };
    }),
});