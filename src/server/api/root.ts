import { bagRouter } from "~/server/api/routers/bag";
import { productRouter } from "~/server/api/routers/product";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { checkoutRouter } from "~/server/api/routers/checkout";
import { orderRouter } from "~/server/api/routers/order";
import { returnsRouter } from "~/server/api/routers/returns";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { dashboardRouter } from "~/server/api/routers/dashboard";
export const appRouter = createTRPCRouter({
  user: userRouter,
  product: productRouter,
  bag: bagRouter,
  checkout: checkoutRouter,
  order: orderRouter,
  returns: returnsRouter,
  inventory: inventoryRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
