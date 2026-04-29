import authRouter from "./auth-router.js";
import { locationRouter } from "./locationRouter.js";
import { attendanceRouter } from "./attendanceRouter.js";
import { createRouter, publicQuery } from "./middleware.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  location: locationRouter,
  attendance: attendanceRouter,
});

export type AppRouter = typeof appRouter;
