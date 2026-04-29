import { getDb } from "./connection";
import { workLocations, attendanceRecords, users } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function findAllWorkLocations() {
  return getDb().query.workLocations.findMany({
    where: eq(workLocations.isActive, "1"),
    orderBy: desc(workLocations.createdAt),
  });
}

export async function findWorkLocationById(id: number) {
  return getDb().query.workLocations.findFirst({
    where: eq(workLocations.id, id),
  });
}

export async function createWorkLocation(data: {
  name: string;
  address?: string;
  latitude: string;
  longitude: string;
  radius?: number;
}) {
  const [{ id }] = await getDb()
    .insert(workLocations)
    .values({
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius ?? 100,
    })
    .$returningId();
  return findWorkLocationById(id);
}

export async function updateWorkLocation(
  id: number,
  data: {
    name?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    radius?: number;
    isActive?: "0" | "1";
  }
) {
  await getDb()
    .update(workLocations)
    .set(data)
    .where(eq(workLocations.id, id));
  return findWorkLocationById(id);
}

export async function deleteWorkLocation(id: number) {
  await getDb()
    .update(workLocations)
    .set({ isActive: "0" })
    .where(eq(workLocations.id, id));
}

export async function findAttendanceRecordsByUser(userId: number) {
  return getDb().query.attendanceRecords.findMany({
    where: eq(attendanceRecords.userId, userId),
    orderBy: desc(attendanceRecords.createdAt),
    with: {
      location: true,
    },
  });
}

export async function findAllAttendanceRecords() {
  return getDb().query.attendanceRecords.findMany({
    orderBy: desc(attendanceRecords.createdAt),
    with: {
      user: true,
      location: true,
    },
  });
}

export async function createAttendanceRecord(data: {
  userId: number;
  locationId: number;
  type: "in" | "out";
  latitude: string;
  longitude: string;
  distance: string;
}) {
  const [{ id }] = await getDb()
    .insert(attendanceRecords)
    .values({
      userId: data.userId,
      locationId: data.locationId,
      type: data.type,
      latitude: data.latitude,
      longitude: data.longitude,
      distance: data.distance,
    })
    .$returningId();
  return getDb().query.attendanceRecords.findFirst({
    where: eq(attendanceRecords.id, id),
    with: {
      user: true,
      location: true,
    },
  });
}

export async function findUnsyncedAttendanceRecords() {
  return getDb().query.attendanceRecords.findMany({
    where: eq(attendanceRecords.syncedToSheets, "0"),
    with: {
      user: true,
      location: true,
    },
  });
}

export async function markAttendanceRecordsAsSynced(ids: number[]) {
  for (const id of ids) {
    await getDb()
      .update(attendanceRecords)
      .set({ syncedToSheets: "1" })
      .where(eq(attendanceRecords.id, id));
  }
}
