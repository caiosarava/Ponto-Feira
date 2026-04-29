import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware.js";
import {
  findAllWorkLocations,
  findWorkLocationById,
  createWorkLocation,
  updateWorkLocation,
  deleteWorkLocation,
} from "./queries/attendance.js";

export const locationRouter = createRouter({
  list: publicQuery.query(() => findAllWorkLocations()),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => findWorkLocationById(input.id)),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        latitude: z.string().min(1),
        longitude: z.string().min(1),
        radius: z.number().min(1).optional(),
      })
    )
    .mutation(({ input }) => createWorkLocation(input)),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        latitude: z.string().min(1).optional(),
        longitude: z.string().min(1).optional(),
        radius: z.number().min(1).optional(),
        isActive: z.enum(["0", "1"]).optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateWorkLocation(id, data);
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteWorkLocation(input.id)),
});
