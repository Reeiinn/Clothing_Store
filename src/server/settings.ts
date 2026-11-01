import type { PrismaClient } from "../../generated/prisma";

/**
 * The admin's "alert when stock is at or below N" setting (StoreSetting id = 1).
 * Upsert so a fresh database without the row doesn't crash.
 */
export async function getLowStockThreshold(db: PrismaClient) {
  const s = await db.storeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return s.lowStockThreshold;
}
