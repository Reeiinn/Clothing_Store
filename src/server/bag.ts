import type { Prisma, PrismaClient } from "../../generated/prisma";
import { lineWarning } from "~/lib/stock";
import { getLowStockThreshold } from "~/server/settings";

export async function getBagLines(
  db: PrismaClient,
  where: Prisma.BagItemWhereInput,
) {
  const [rows, threshold] = await Promise.all([
    db.bagItem.findMany({
      where,
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
    getLowStockThreshold(db),
  ]);

  return rows.map(({ variant, ...row }) => ({
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
    stock: variant.stock,
    lineTotalCents: variant.product.priceCents * row.quantity,
    warning: lineWarning(
      variant.stock,
      row.quantity,
      threshold,
      `${variant.color.name} / ${variant.size}`,
    ),
  }));
}

export function bagTotals(
  lines: { quantity: number; lineTotalCents: number }[],
) {
  return {
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
  };
}
