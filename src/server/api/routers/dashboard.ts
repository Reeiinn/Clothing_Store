import { stockStatus } from "~/lib/stock";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { withTotal } from "~/server/order-total";
import { getLowStockThreshold } from "~/server/settings";

export const dashboardRouter = createTRPCRouter({
  overview: adminProcedure.query(async ({ ctx }) => {
    const threshold = await getLowStockThreshold(ctx.db);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      ordersToShip,
      openReturns,
      soldOutCount,
      lowStockCount,
      sales,
      recentOrders,
      needsStock,
    ] = await Promise.all([
      ctx.db.order.count({ where: { status: "PROCESSING" } }),
      ctx.db.returnRequest.count({
        where: { status: { in: ["REQUESTED", "APPROVED"] } },
      }),
      ctx.db.variant.count({ where: { stock: 0 } }),
      ctx.db.variant.count({ where: { stock: { gte: 1, lte: threshold } } }),
      ctx.db.order.findMany({
        where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
        select: {
          shippingCents: true,
          items: { select: { unitPriceCents: true, quantity: true } },
        },
      }),
      ctx.db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          number: true,
          status: true,
          shippingCents: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          items: { select: { unitPriceCents: true, quantity: true } },
        },
      }),
      ctx.db.variant.findMany({
        where: { stock: { lte: threshold } },
        orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
        take: 5,
        select: {
          id: true,
          size: true,
          stock: true,
          color: { select: { name: true } },
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      ordersToShip,
      openReturns,
      soldOutCount,
      lowStockCount,
      salesThisMonthCents: sales.reduce(
        (sum, order) => sum + withTotal(order).totalCents,
        0,
      ),
      recentOrders: recentOrders.map(withTotal),
      needsStock: needsStock.map((variant) => ({
        variantId: variant.id,
        productId: variant.product.id,
        productName: variant.product.name,
        color: variant.color.name,
        size: variant.size,
        stock: variant.stock,
        status: stockStatus(variant.stock, threshold),
      })),
    };
  }),
});
