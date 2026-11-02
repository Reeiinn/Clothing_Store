import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { Size } from "../../../../generated/prisma";
import { SIZES } from "~/lib/constants";
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

    const [lowStockCount, soldOutCount] = await Promise.all([
      ctx.db.variant.count({ where: { stock: { gte: 1, lte: threshold } } }),
      ctx.db.variant.count({ where: { stock: 0 } }),
    ]);

    return { lowStockCount, soldOutCount };
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
            size: true,
            color: { select: { name: true, hex: true } },
            product: { select: { id: true, name: true } },
          },
        }),
        ctx.db.variant.count({ where }),
      ]);

      return {
        rows: variants.map((variant) => ({
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          color: variant.color.name,
          colorHex: variant.color.hex,
          size: variant.size,
          stock: variant.stock,
          status: stockStatus(variant.stock, threshold),
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
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
          imageUrl: true,
          priceCents: true,
          category: { select: { name: true } },
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
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        category: product.category.name,
        sizes,
        colors,
        cells,
      };
    }),

  createProduct: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Enter a product name.").max(100),
        description: z.string().trim().min(1, "Enter a description."),
        categorySlug: z.string().min(1, "Pick a category."),
        gender: z.enum(["MEN", "WOMEN", "UNISEX"]),
        priceCents: z.number().int().min(1, "Enter a price."),
        colors: z.array(z.string()).min(1, "Pick at least one color."),
        sizes: z.array(z.enum(SIZES)).min(1, "Pick at least one size."),
        stock: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const [existing, category, colors] = await Promise.all([
        ctx.db.product.findUnique({ where: { slug }, select: { id: true } }),
        ctx.db.category.findUnique({ where: { slug: input.categorySlug } }),
        ctx.db.color.findMany({ where: { name: { in: input.colors } } }),
      ]);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A product with this name already exists.",
        });
      }
      if (!category || colors.length !== input.colors.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown category or color.",
        });
      }

      const product = await ctx.db.product.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          gender: input.gender,
          priceCents: input.priceCents,
          categoryId: category.id,
          variants: {
            create: colors.flatMap((color) =>
              input.sizes.map((size) => ({
                sku: `${slug}-${color.slug}-${size}`.toUpperCase(),
                colorId: color.id,
                size,
                stock: input.stock,
              })),
            ),
          },
        },
        select: { id: true },
      });

      return { id: product.id };
    }),

  products: adminProcedure.query(async ({ ctx }) => {
    const threshold = await getLowStockThreshold(ctx.db);
    const products = await ctx.db.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        priceCents: true,
        category: { select: { name: true } },
        variants: {
          select: { stock: true, color: { select: { name: true, hex: true } } },
        },
      },
    });

    return products.map((product) => {
      const stocks = product.variants.map((variant) => variant.stock);
      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        category: product.category.name,
        colors: [
          ...new Map(
            product.variants.map((variant) => [
              variant.color.name,
              variant.color,
            ]),
          ).values(),
        ],
        totalStock: stocks.reduce((sum, stock) => sum + stock, 0),
        soldOut: stocks.filter((stock) => stock === 0).length,
        low: stocks.filter((stock) => stockStatus(stock, threshold) === "LOW")
          .length,
      };
    });
  }),
});
