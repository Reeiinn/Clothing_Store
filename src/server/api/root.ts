import { bagRouter } from "~/server/api/routers/bag";
import { productRouter } from "~/server/api/routers/product";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { checkoutRouter } from "~/server/api/routers/checkout";
import { orderRouter } from "~/server/api/routers/order";
import { returnsRouter } from "~/server/api/routers/returns";
import { inventoryRouter } from "~/server/api/routers/inventory";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  product: productRouter,
  bag: bagRouter,
  checkout: checkoutRouter,
  order: orderRouter,
  returns: returnsRouter,
  inventory: inventoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.user.me();
 */
export const createCaller = createCallerFactory(appRouter);
