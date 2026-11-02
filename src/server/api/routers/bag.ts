import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { PrismaClient } from "../../../../generated/prisma";
import { lineWarning } from "~/lib/stock";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getLowStockThreshold } from "~/server/settings";

const itemInput = z.object({ itemId: z.string() });

function soldOut() {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: "This size and color is sold out",
  });
}

// Matching on userId too, so another user's item just looks missing
async function findOwnItem(db: PrismaClient, userId: string, itemId: string) {
  const item = await db.bagItem.findFirst({
    where: { id: itemId, userId },
    include: {
      variant: {
        select: { size: true, stock: true, color: { select: { name: true } } },
      },
    },
  });
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Bag item not found." });
  }
  return item;
}

export const bagRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [rows, threshold] = await Promise.all([
      ctx.db.bagItem.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          variantId: true,
          quantity: true,
          savedForLater: true,
          variant: {
            select: {
              size: true,
              stock: true,
              color: { select: { name: true } },
              product: {
                select: {
                  name: true,
                  slug: true,
                  imageUrl: true,
                  priceCents: true,
                },
              },
            },
          },
        },
      }),
      getLowStockThreshold(ctx.db),
    ]);

    const lines = rows.map(({ variant, ...row }) => {
      const { stock } = variant;
      const warning = lineWarning(
        stock,
        row.quantity,
        threshold,
        `${variant.color.name} / ${variant.size}`,
      );
      return {
        id: row.id,
        variantId: row.variantId,
        savedForLater: row.savedForLater,
        name: variant.product.name,
        slug: variant.product.slug,
        imageUrl: variant.product.imageUrl,
        size: variant.size,
        color: variant.color.name,
        unitPriceCents: variant.product.priceCents,
        quantity: row.quantity,
        stock,
        lineTotalCents: variant.product.priceCents * row.quantity,
        warning,
      };
    });

    const items = lines.filter((l) => !l.savedForLater);
    return {
      items,
      saved: lines.filter((l) => l.savedForLater),
      itemCount: items.reduce((sum, l) => sum + l.quantity, 0),
      subtotalCents: items.reduce((sum, l) => sum + l.lineTotalCents, 0),
    };
  }),

  // Public so the header can call it when signed out
  count: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return 0;
    const { _sum } = await ctx.db.bagItem.aggregate({
      where: { userId: ctx.session.user.id, savedForLater: false },
      _sum: { quantity: true },
    });
    return _sum.quantity ?? 0;
  }),

  add: protectedProcedure
    .input(
      z.object({ variantId: z.string(), quantity: z.number().int().min(1) }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [variant, existing] = await Promise.all([
        ctx.db.variant.findUnique({
          where: { id: input.variantId },
          select: { stock: true },
        }),
        ctx.db.bagItem.findUnique({
          where: { userId_variantId: { userId, variantId: input.variantId } },
          select: { quantity: true },
        }),
      ]);
      if (!variant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });
      }
      if (variant.stock === 0) throw soldOut();

      const wanted = (existing?.quantity ?? 0) + input.quantity;
      const quantity = Math.min(wanted, variant.stock);
      const item = await ctx.db.bagItem.upsert({
        where: { userId_variantId: { userId, variantId: input.variantId } },
        create: { userId, variantId: input.variantId, quantity },
        update: { quantity, savedForLater: false },
        select: { id: true, quantity: true },
      });
      return { ...item, capped: quantity < wanted };
    }),

  updateQuantity: protectedProcedure
    .input(itemInput.extend({ quantity: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const item = await findOwnItem(ctx.db, ctx.session.user.id, input.itemId);
      const { stock, size, color } = item.variant;
      if (input.quantity < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quantity must be at least 1",
        });
      }
      if (stock === 0) throw soldOut();
      if (input.quantity > stock) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Only ${stock} left in ${color.name} / ${size}`,
        });
      }
      await ctx.db.bagItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
      });
    }),

  remove: protectedProcedure
    .input(itemInput)
    .mutation(async ({ ctx, input }) => {
      const item = await findOwnItem(ctx.db, ctx.session.user.id, input.itemId);
      await ctx.db.bagItem.delete({ where: { id: item.id } });
    }),

  saveForLater: protectedProcedure
    .input(itemInput)
    .mutation(async ({ ctx, input }) => {
      const item = await findOwnItem(ctx.db, ctx.session.user.id, input.itemId);
      await ctx.db.bagItem.update({
        where: { id: item.id },
        data: { savedForLater: true },
      });
    }),

  moveToBag: protectedProcedure
    .input(itemInput)
    .mutation(async ({ ctx, input }) => {
      const item = await findOwnItem(ctx.db, ctx.session.user.id, input.itemId);
      // Min 1: a sold-out row stays in the bag and shows its warning
      const quantity = Math.max(1, Math.min(item.quantity, item.variant.stock));
      await ctx.db.bagItem.update({
        where: { id: item.id },
        data: { savedForLater: false, quantity },
      });
    }),
});
