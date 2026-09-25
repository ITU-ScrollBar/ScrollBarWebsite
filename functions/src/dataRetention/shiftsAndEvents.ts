import { FieldValue, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  RETENTION_ENVS,
  RetentionEnv,
  SCHEDULE_OPTIONS,
  SHIFT_RETENTION_MONTHS,
  db,
  deleteStorageFileByUrl,
  envCollection,
  monthsAgo,
} from "./common";

// Each engagement costs one delete plus at most one user update, keeping batches under 500 writes.
const ENGAGEMENT_BATCH_SIZE = 200;
// Firestore caps `in` filters at 30 values.
const SHIFT_BATCH_SIZE = 30;
const EVENT_BATCH_SIZE = 400;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

type UserTally = { count: number; firstShiftEnd: Date | null };

/**
 * Deletes engagements and folds them into `users/{uid}.archivedShiftStats.{env}` in the same
 * batch, so a user's lifetime shift count and "member since" survive the deletion. Users whose
 * doc is already gone just lose the engagement.
 */
const archiveEngagements = async (
  env: RetentionEnv,
  engagements: QueryDocumentSnapshot[]
): Promise<void> => {
  for (const page of chunk(engagements, ENGAGEMENT_BATCH_SIZE)) {
    const tallies = new Map<string, UserTally>();
    for (const engagement of page) {
      const userId = engagement.get("userId");
      if (typeof userId !== "string" || !userId) continue;

      const tally = tallies.get(userId) ?? { count: 0, firstShiftEnd: null };
      const shiftEnd = toDate(engagement.get("shiftEnd"));
      tally.count++;
      if (shiftEnd && (!tally.firstShiftEnd || shiftEnd < tally.firstShiftEnd)) {
        tally.firstShiftEnd = shiftEnd;
      }
      tallies.set(userId, tally);
    }

    const batch = db.batch();
    page.forEach((engagement) => batch.delete(engagement.ref));

    const userRefs = [...tallies.keys()].map((uid) => db.collection("users").doc(uid));
    const users = userRefs.length ? await db.getAll(...userRefs) : [];
    for (const user of users) {
      if (!user.exists) continue;

      const tally = tallies.get(user.id)!;
      const statsPath = `archivedShiftStats.${env}`;
      const update: Record<string, unknown> = {
        [`${statsPath}.count`]: FieldValue.increment(tally.count),
      };
      const storedFirst = toDate(user.get(`${statsPath}.firstShiftEnd`));
      if (tally.firstShiftEnd && (!storedFirst || tally.firstShiftEnd < storedFirst)) {
        update[`${statsPath}.firstShiftEnd`] = Timestamp.fromDate(tally.firstShiftEnd);
      }
      batch.update(user.ref, update);
    }

    await batch.commit();
  }
};

const cleanupEngagements = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "engagements").where("shiftEnd", "<", cutoff).get();
  await archiveEngagements(env, snapshot.docs);
  return snapshot.size;
};

// Also archives any engagement left on a deleted shift (e.g. its shiftEnd was never updated
// after the shift moved), mirroring the client-side deleteShift in src/firebase/api/shifts.ts.
const cleanupShifts = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "shifts").where("end", "<", cutoff).get();

  for (const page of chunk(snapshot.docs, SHIFT_BATCH_SIZE)) {
    const leftovers = await envCollection(env, "engagements")
      .where("shiftId", "in", page.map((shift) => shift.id))
      .get();
    await archiveEngagements(env, leftovers.docs);

    const batch = db.batch();
    page.forEach((shift) => batch.delete(shift.ref));
    await batch.commit();
  }

  return snapshot.size;
};

const cleanupEvents = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "events").where("end", "<", cutoff).get();
  let deleted = 0;

  for (const page of chunk(snapshot.docs, EVENT_BATCH_SIZE)) {
    const batch = db.batch();
    for (const event of page) {
      try {
        await deleteStorageFileByUrl(event.get("photo_url"));
      } catch (error) {
        // Keep the doc so its photo_url still points at the file; the next run retries.
        console.warn(`[${env}] Kept event ${event.id}: could not delete its picture`, error);
        continue;
      }
      batch.delete(event.ref);
      deleted++;
    }
    await batch.commit();
  }

  return deleted;
};

/**
 * Daily: deletes shifts, their engagements and events that ended more than
 * SHIFT_RETENTION_MONTHS ago. Engagements are counted into the user's archivedShiftStats
 * first so the profile's total shift counter keeps them.
 */
export const cleanupOldShiftsAndEvents = onSchedule(
  { ...SCHEDULE_OPTIONS, schedule: "every day 03:00" },
  async () => {
    const cutoff = monthsAgo(SHIFT_RETENTION_MONTHS);

    for (const env of RETENTION_ENVS) {
      const engagements = await cleanupEngagements(env, cutoff);
      const shifts = await cleanupShifts(env, cutoff);
      const events = await cleanupEvents(env, cutoff);
      console.log(
        `[${env}] Deleted ${shifts} shifts, ${engagements} engagements and ${events} events that ended before ${cutoff.toISOString()}.`
      );
    }
  }
);
