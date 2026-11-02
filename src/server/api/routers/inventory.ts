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
import { Size } from "../../../../generated/prisma";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { getLowStockThreshold } from "~/server/settings";

const alertFilterSchema = z.enum(["ALL", "SOLD_OUT", "LOW"]);

const alertPaginationSchema = z.object({
  filter: alertFilterSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

function getStockStatus(stock: number, threshold: number) {
  if (stock === 0) return "SOLD_OUT" as const;
  if (stock <= threshold) return "LOW" as const;
  return "OK" as const;
}

export const inventoryRouter = createTRPCRouter({
  stats: adminProcedure.query(async ({ ctx }) => {
    const threshold = await getLowStockThreshold(ctx.db);

    const [lowStockCount, soldOutCount, ordersToShip, openReturns] =
      await Promise.all([
        ctx.db.variant.count({
          where: { stock: { gte: 1, lte: threshold } },
        }),
        ctx.db.variant.count({ where: { stock: 0 } }),
        ctx.db.order.count({ where: { status: "PROCESSING" } }),
        ctx.db.returnRequest.count({
          where: { status: { in: ["REQUESTED", "APPROVED"] } },
        }),
      ]);

    return { lowStockCount, soldOutCount, ordersToShip, openReturns };
  }),

  getThreshold: adminProcedure.query(async ({ ctx }) => ({
    threshold: await getLowStockThreshold(ctx.db),
  })),

  setThreshold: adminProcedure
    .input(z.object({ threshold: z.number().int().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const setting = await ctx.db.storeSetting.upsert({
        where: { id: 1 },
        update: { lowStockThreshold: input.threshold },
        create: { id: 1, lowStockThreshold: input.threshold },
        select: { lowStockThreshold: true },
      });

      return { threshold: setting.lowStockThreshold };
    }),

  alerts: adminProcedure
    .input(alertPaginationSchema)
    .query(async ({ ctx, input }) => {
      const threshold = await getLowStockThreshold(ctx.db);
      const stockFilter =
        input.filter === "SOLD_OUT"
          ? { stock: 0 }
          : input.filter === "LOW"
            ? { stock: { gte: 1, lte: threshold } }
            : { stock: { lte: threshold } };

      const where = stockFilter;
      const [variants, total] = await Promise.all([
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
          select: {
            id: true,
            stock: true,
            restockRequestedAt: true,
            size: true,
            color: { select: { name: true } },
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
          },
        }),
        ctx.db.variant.count({ where }),
      ]);

      return {
        rows: variants.map((variant) => ({
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          category: variant.product.category.name,
          color: variant.color.name,
          size: variant.size,
          stock: variant.stock,
          status: getStockStatus(variant.stock, threshold),
          restockRequested: variant.restockRequestedAt !== null,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  requestRestock: adminProcedure
    .input(z.object({ variantId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.variant.update({
          where: { id: input.variantId },
          data: { restockRequestedAt: new Date() },
        });
      } catch (error) {
        if (
          error instanceof TRPCError ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2025")
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Variant not found.",
          });
        }
        throw error;
      }

      return { success: true };
    }),

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
        addQuantity: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.variant.update({
        where: { id: input.variantId },
        data: {
          stock: { increment: input.addQuantity },
          restockRequestedAt: null,
        },
        select: { id: true, stock: true },
      });

      return { variantId: variant.id, stock: variant.stock };
    }),

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
        stock: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const variant = await ctx.db.variant.update({
        where: { id: input.variantId },
        data: {
          stock: input.stock,
          ...(input.stock > 0 ? { restockRequestedAt: null } : {}),
        },
        select: { id: true, stock: true },
      });

      return { variantId: variant.id, stock: variant.stock };
    }),

  variantMatrix: adminProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const threshold = await getLowStockThreshold(ctx.db);
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
        select: {
          name: true,
          variants: {
            select: {
              id: true,
              size: true,
              stock: true,
              color: { select: { name: true, hex: true } },
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const colors = [
        ...new Map(
          product.variants.map((variant) => [
            variant.color.name,
            variant.color,
          ]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name));

      const sizes = Object.values(Size);
      const variantsByColorAndSize = new Map(
        product.variants.map((variant) => [
          `${variant.color.name}:${variant.size}`,
          variant,
        ]),
      );

      const cells = colors.flatMap((color) =>
        sizes.map((size) => {
          const variant = variantsByColorAndSize.get(`${color.name}:${size}`);
          const stock = variant?.stock ?? 0;

          return {
            color: color.name,
            size,
            variantId: variant?.id ?? null,
            stock,
            status: getStockStatus(stock, threshold),
          };
        }),
      );

      return {
        productName: product.name,
        sizes,
        colors,
        cells,
      };
    }),
});
