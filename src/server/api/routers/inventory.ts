import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Size } from "../../../../generated/prisma";
import { stockStatus } from "~/lib/stock";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { getLowStockThreshold } from "~/server/settings";

const alertFilterSchema = z.enum(["ALL", "SOLD_OUT", "LOW"]);

const alertPaginationSchema = z.object({
  filter: alertFilterSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

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
          status: stockStatus(variant.stock, threshold),
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
            status: stockStatus(stock, threshold),
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