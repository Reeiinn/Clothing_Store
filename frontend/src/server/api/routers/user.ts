import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, name: true, email: true, image: true },
    });
  }),
});
