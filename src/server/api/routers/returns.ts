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
