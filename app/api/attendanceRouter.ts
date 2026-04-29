import { z } from "zod";
import { createRouter, authedQuery, adminQuery, publicQuery } from "./middleware.js";
import {
  findAttendanceRecordsByUser,
  findAllAttendanceRecords,
  createAttendanceRecord,
  findUnsyncedAttendanceRecords,
  markAttendanceRecordsAsSynced,
} from "./queries/attendance.js";
import { findWorkLocationById } from "./queries/attendance.js";
import { appendAttendanceRecords } from "./services/googleSheets.js";
import { env } from "./lib/env.js";
import { TRPCError } from "@trpc/server";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const attendanceRouter = createRouter({
  list: authedQuery.query(({ ctx }) =>
    findAttendanceRecordsByUser(ctx.user.id)
  ),

  all: adminQuery.query(() => findAllAttendanceRecords()),

  register: authedQuery
    .input(
      z.object({
        locationId: z.number(),
        type: z.enum(["in", "out"]),
        latitude: z.string(),
        longitude: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const location = await findWorkLocationById(input.locationId);
      if (!location || location.isActive === "0") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Local de trabalho não encontrado ou inativo",
        });
      }

      const userLat = parseFloat(input.latitude);
      const userLng = parseFloat(input.longitude);
      const locLat = parseFloat(location.latitude);
      const locLng = parseFloat(location.longitude);

      const distance = haversineDistance(userLat, userLng, locLat, locLng);
      const radius = location.radius;

      if (distance > radius) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Você está a ${Math.round(distance)}m do local permitido. Máximo: ${radius}m`,
        });
      }

      const record = await createAttendanceRecord({
        userId: ctx.user.id,
        locationId: input.locationId,
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        distance: distance.toFixed(2),
      });

      return { record, distance: Math.round(distance) };
    }),

  syncToSheets: adminQuery.mutation(async () => {
    if (!env.googleCredentialsBase64 || !env.googleSheetsSpreadsheetId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Google Sheets não configurado",
      });
    }

    const unsynced = await findUnsyncedAttendanceRecords();
    if (unsynced.length === 0) {
      return { synced: 0 };
    }

    await appendAttendanceRecords(env.googleSheetsSpreadsheetId, unsynced);
    await markAttendanceRecordsAsSynced(unsynced.map((r) => r.id));

    return { synced: unsynced.length };
  }),

  config: publicQuery.query(() => ({
    sheetsConfigured: !!env.googleCredentialsBase64 && !!env.googleSheetsSpreadsheetId,
  })),
});
