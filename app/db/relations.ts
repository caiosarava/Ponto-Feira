import { relations } from "drizzle-orm";
import { users, workLocations, attendanceRecords } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  attendanceRecords: many(attendanceRecords),
}));

export const workLocationsRelations = relations(workLocations, ({ many }) => ({
  attendanceRecords: many(attendanceRecords),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  user: one(users, { fields: [attendanceRecords.userId], references: [users.id] }),
  location: one(workLocations, { fields: [attendanceRecords.locationId], references: [workLocations.id] }),
}));