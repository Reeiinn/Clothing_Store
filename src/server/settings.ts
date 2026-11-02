import type { PrismaClient } from "../../generated/prisma";

export async function getLowStockThreshold(db: PrismaClient) {
  const s = await db.storeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return s.lowStockThreshold;
}
