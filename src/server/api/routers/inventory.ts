import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import type { db } from "~/server/db";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;
const DEFAULT_THRESHOLD = 3;

type Db = typeof db;
type StockStatus = "SOLD_OUT" | "LOW" | "OK";

async function getThreshold(client: Db) {
  const setting = await client.storeSetting.findUnique({ where: { id: 1 } });
  return setting?.lowStockThreshold ?? DEFAULT_THRESHOLD;
}

function stockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return "SOLD_OUT";
  if (stock <= threshold) return "LOW";
  return "OK";
}

export const inventoryRouter = createTRPCRouter({
  /** Numbers for the four stat cards and the threshold control. */
  stats: adminProcedure.query(async ({ ctx }) => {
    const threshold = await getThreshold(ctx.db);

    const [lowStock, soldOut, ordersToShip, openReturns] = await Promise.all([
      ctx.db.variant.count({ where: { stock: { gt: 0, lte: threshold } } }),
      ctx.db.variant.count({ where: { stock: { lte: 0 } } }),
      ctx.db.order.count({ where: { status: "PROCESSING" } }),
      // "Open" = still needs an admin action (approve, or mark received).
      ctx.db.returnRequest.count({
        where: { status: { in: ["REQUESTED", "APPROVED"] } },
      }),
    ]);

    return { threshold, lowStock, soldOut, ordersToShip, openReturns };
  }),

  /** Variants at or below the threshold, lowest stock first. */
  alerts: adminProcedure
    .input(
      z.object({
        filter: z.enum(["ALL", "SOLD_OUT", "LOW"]).default("ALL"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const threshold = await getThreshold(ctx.db);

      const stock =
        input.filter === "SOLD_OUT"
          ? { lte: 0 }
          : input.filter === "LOW"
            ? { gt: 0, lte: threshold }
            : { lte: threshold };

      const where = { stock };
      const [total, variants] = await Promise.all([
        ctx.db.variant.count({ where }),
        ctx.db.variant.findMany({
          where,
          orderBy: [
            { stock: "asc" },
            { product: { name: "asc" } },
            { color: { name: "asc" } },
            { size: "asc" },
          ],
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
            color: { select: { name: true, hex: true } },
          },
        }),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        items: variants.map((variant) => ({
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          categoryName: variant.product.category.name,
          colorName: variant.color.name,
          colorHex: variant.color.hex,
          size: variant.size,
          stock: variant.stock,
          restockRequested: variant.restockRequestedAt !== null,
          status: stockStatus(variant.stock, threshold),
        })),
      };
    }),

  /**
   * Colors x sizes grid for one product. Without a productId it picks the
   * first product in the alerts list, or the first product by name.
   */
  variantGrid: adminProcedure
    .input(z.object({ productId: z.string().min(1).optional() }))
    .query(async ({ ctx, input }) => {
      const threshold = await getThreshold(ctx.db);

      let productId = input.productId;
      if (!productId) {
        const firstAlert = await ctx.db.variant.findFirst({
          where: { stock: { lte: threshold } },
          orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
          select: { productId: true },
        });
        const firstProduct = firstAlert
          ? null
          : await ctx.db.product.findFirst({
              orderBy: { name: "asc" },
              select: { id: true },
            });
        productId = firstAlert?.productId ?? firstProduct?.id;
      }
      if (!productId) return null;

      const product = await ctx.db.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          variants: {
            select: {
              id: true,
              size: true,
              stock: true,
              color: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!product) return null;

      const colors = new Map<string, string>();
      for (const variant of product.variants) {
        colors.set(variant.color.id, variant.color.name);
      }

      return {
        productId: product.id,
        productName: product.name,
        sizes: [...SIZES],
        rows: [...colors.entries()]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([colorId, colorName]) => ({
            colorName,
            cells: SIZES.map((size) => {
              const variant = product.variants.find(
                (v) => v.color.id === colorId && v.size === size,
              );
              return variant
                ? {
                    size,
                    variantId: variant.id,
                    stock: variant.stock,
                    status: stockStatus(variant.stock, threshold),
                  }
                : { size, variantId: null, stock: null, status: null };
            }),
          })),
      };
    }),

  setThreshold: adminProcedure
    .input(
      z.object({
        threshold: z
          .number({ invalid_type_error: "Enter a whole number." })
          .int("Enter a whole number.")
          .min(0, "The threshold can't be negative.")
          .max(1000, "The threshold can't be more than 1000."),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.storeSetting.upsert({
        where: { id: 1 },
        update: { lowStockThreshold: input.threshold },
        create: { id: 1, lowStockThreshold: input.threshold },
      });
    }),

  /** Flags a variant as "restock requested". Doesn't change stock. */
  requestRestock: adminProcedure
    .input(z.object({ variantId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.variant.updateMany({
        where: { id: input.variantId },
        data: { restockRequestedAt: new Date() },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found.",
        });
      }
      return { ok: true };
    }),

  /** Adds units to a variant and clears its "restock requested" flag. */
  restock: adminProcedure
    .input(
      z.object({
        variantId: z.string().min(1),
        quantity: z
          .number({ invalid_type_error: "Enter a whole number." })
          .int("Enter a whole number.")
          .min(1, "Add at least 1 unit.")
          .max(100000, "That quantity is too large."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.variant.updateMany({
        where: { id: input.variantId },
        data: {
          stock: { increment: input.quantity },
          restockRequestedAt: null,
        },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found.",
        });
      }
      return { ok: true };
    }),

  /** Sets the exact stock number (for corrections after a count). */
  setStock: adminProcedure
    .input(
      z.object({
        variantId: z.string().min(1),
        stock: z
          .number({ invalid_type_error: "Enter a whole number." })
          .int("Enter a whole number.")
          .min(0, "Stock can't be negative.")
          .max(100000, "That quantity is too large."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.variant.updateMany({
        where: { id: input.variantId },
        data: { stock: input.stock },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found.",
        });
      }
      return { ok: true };
    }),
});
