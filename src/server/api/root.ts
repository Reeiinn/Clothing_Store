import { productRouter } from "~/server/api/routers/product";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  product: productRouter,
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
