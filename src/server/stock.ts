import type { Prisma } from "../../generated/prisma";

export async function restock(
  tx: Prisma.TransactionClient,
  items: { variantId: string; quantity: number }[],
) {
  for (const item of items) {
    await tx.variant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
