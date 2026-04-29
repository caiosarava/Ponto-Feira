import { authRouter } from "./auth-router";
import { locationRouter } from "./locationRouter";
import { attendanceRouter } from "./attendanceRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  location: locationRouter,
  attendance: attendanceRouter,
});

export type AppRouter = typeof appRouter;
