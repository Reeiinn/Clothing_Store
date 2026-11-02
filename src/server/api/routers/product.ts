import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "../../../../generated/prisma";
import { SIZES } from "~/lib/constants";
import { stockStatus } from "~/lib/stock";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getLowStockThreshold } from "~/server/settings";

const genderInput = z.enum(["men", "women"]);

function genderWhere(
  gender: z.infer<typeof genderInput> | undefined,
): Prisma.ProductWhereInput {
  if (!gender) return {};
  return { gender: { in: [gender === "men" ? "MEN" : "WOMEN", "UNISEX"] } };
}

const listInput = z.object({
  category: z.string().optional(),
  gender: genderInput.optional(),
  sizes: z.array(z.enum(SIZES)).optional(),
  colors: z.array(z.string()).optional(),
  inStockSize: z.enum(SIZES).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(8),
});

type ListInput = z.infer<typeof listInput>;

function buildWhere(input: ListInput): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [
    { hidden: false },
    genderWhere(input.gender),
  ];
  if (input.category) and.push({ category: { slug: input.category } });
  if (input.q) and.push({ name: { contains: input.q, mode: "insensitive" } });

  const colorFilter = input.colors?.length
    ? { color: { name: { in: input.colors } } }
    : {};

  // One `some` so size and color must match the same variant
  if (input.sizes?.length || input.colors?.length) {
    and.push({
      variants: {
        some: {
          ...(input.sizes?.length ? { size: { in: input.sizes } } : {}),
          ...colorFilter,
        },
      },
    });
  }

  if (input.inStockSize) {
    and.push({
      variants: {
        some: { size: input.inStockSize, stock: { gt: 0 }, ...colorFilter },
      },
    });
  }

  return { AND: and };
}

function sortOrder(
  sort: ListInput["sort"],
): Prisma.ProductOrderByWithRelationInput[] {
  const primary: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { priceCents: "asc" }
      : sort === "price_desc"
        ? { priceCents: "desc" }
        : { createdAt: "desc" };
  return [primary, { id: "asc" }];
}

export const productRouter = createTRPCRouter({
  list: publicProcedure
    .input(listInput.default({}))
    .query(async ({ ctx, input }) => {
      const where = buildWhere(input);

      const [total, products, threshold] = await Promise.all([
        ctx.db.product.count({ where }),
        ctx.db.product.findMany({
          where,
          orderBy: sortOrder(input.sort),
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          select: {
            id: true,
            slug: true,
            name: true,
            priceCents: true,
            imageUrl: true,
            variants: {
              select: {
                size: true,
                stock: true,
                color: { select: { name: true, hex: true } },
              },
              orderBy: [{ color: { name: "asc" } }, { size: "asc" }],
            },
          },
        }),
        getLowStockThreshold(ctx.db),
      ]);

      const items = products.map(({ variants, ...product }) => {
        const colors = [
          ...new Map(variants.map((v) => [v.color.name, v.color])).values(),
        ];
        const sizes = SIZES.filter((s) => variants.some((v) => v.size === s));
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        return {
          ...product,
          colors,
          sizeRange: sizes.length
            ? { min: sizes[0]!, max: sizes[sizes.length - 1]! }
            : null,
          stockFlag: stockStatus(totalStock, threshold),
        };
      });

      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  facets: publicProcedure
    .input(z.object({ gender: genderInput.optional() }).default({}))
    .query(async ({ ctx, input }) => {
      const productWhere = { hidden: false, ...genderWhere(input.gender) };
      const [categories, colors] = await Promise.all([
        ctx.db.category.findMany({
          orderBy: { name: "asc" },
          select: {
            slug: true,
            name: true,
            _count: { select: { products: { where: productWhere } } },
          },
        }),
        ctx.db.color.findMany({
          orderBy: { name: "asc" },
          select: { name: true, hex: true },
        }),
      ]);
      return {
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          count: c._count.products,
        })),
        colors,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [product, lowStockThreshold] = await Promise.all([
        ctx.db.product.findUnique({
          where: { slug: input.slug },
          include: {
            category: { select: { name: true, slug: true } },
            variants: {
              include: { color: true },
              orderBy: [{ color: { name: "asc" } }, { size: "asc" }],
            },
          },
        }),
        getLowStockThreshold(ctx.db),
      ]);
      if (!product || product.hidden) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found.",
        });
      }

      const variants = product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color.name,
        colorHex: v.color.hex,
        stock: v.stock,
      }));

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        fabric: product.fabric,
        fitNotes: product.fitNotes,
        gender: product.gender,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        category: product.category,
        variants,
        sizes: SIZES.filter((s) => variants.some((v) => v.size === s)),
        colors: [
          ...new Map(
            variants.map((v) => [v.color, { name: v.color, hex: v.colorHex }]),
          ).values(),
        ],
        lowStockThreshold,
      };
    }),
});
