import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

const orderStatus = z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const orderRouter = createTRPCRouter({
  /** All orders for the admin table. Pass a status to filter, omit for "All". */
  adminList: adminProcedure
    .input(z.object({ status: orderStatus.optional() }).optional())
    .query(({ ctx, input }) => {
      return ctx.db.order.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { quantity: true } },
        },
      });
    }),

  /** One order with items, shipping address and status history. */
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

  /**
   * PROCESSING -> SHIPPED (tracking number required)
   * PROCESSING -> CANCELLED (stock goes back)
   * SHIPPED    -> DELIVERED
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
        status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]),
        trackingNumber: z.string().trim().max(100).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          include: { items: true },
        });
        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        const allowedFrom =
          input.status === "DELIVERED" ? "SHIPPED" : "PROCESSING";
        if (order.status !== allowedFrom) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Order #${order.number} is ${order.status}, so it can't be marked ${input.status}.`,
          });
        }

        if (input.status === "SHIPPED" && !input.trackingNumber) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a tracking number to mark this order as shipped.",
          });
        }

        // Guard on the current status so two admins can't apply the same step twice.
        const now = new Date();
        const moved = await tx.order.updateMany({
          where: { id: order.id, status: allowedFrom },
          data: {
            status: input.status,
            ...(input.status === "SHIPPED" && {
              trackingNumber: input.trackingNumber,
              shippedAt: now,
            }),
            ...(input.status === "DELIVERED" && { deliveredAt: now }),
          },
        });
        if (moved.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This order was just updated by someone else. Refresh.",
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

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: input.status,
            note:
              input.status === "SHIPPED"
                ? `Tracking number: ${input.trackingNumber}`
                : input.status === "CANCELLED"
                  ? "Cancelled by admin. Stock returned."
                  : null,
          },
        });

        return tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            user: { select: { name: true, email: true } },
            items: { select: { quantity: true } },
          },
        });
      });
    }),
});
