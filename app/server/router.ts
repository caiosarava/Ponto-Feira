import authRouter from "./auth-router.ts";
import { locationRouter } from "./locationRouter.ts";
import { attendanceRouter } from "./attendanceRouter.ts";
import { createRouter, publicQuery } from "./middleware.ts";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  location: locationRouter,
  attendance: attendanceRouter,
});

export type AppRouter = typeof appRouter;
