import { FieldValue, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  RETENTION_ENVS,
  RetentionEnv,
  SCHEDULE_OPTIONS,
  SHIFT_RETENTION_MONTHS,
  chunk,
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

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const uniqueStrings = (values: unknown[]): string[] =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && !!value))];

type UserTally = { count: number; firstShiftEnd: Date | null };

/**
 * Deletes engagements and folds them into `users/{uid}.archivedShiftStats.{env}` in the same
 * batch, so a user's lifetime shift count and "member since" survive the deletion. Users whose
 * doc is already gone just lose the engagement.
 *
 * Every delete requires the engagement to still exist: if an overlapping run (Cloud Scheduler
 * delivers at least once) already archived one, the whole batch fails instead of counting it twice.
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
    page.forEach((engagement) => batch.delete(engagement.ref, { exists: true }));

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

/**
 * Deletes shifts that ended before the cutoff together with all their engagements, mirroring
 * the client-side deleteShift in src/firebase/api/shifts.ts. A shift whose event still ends
 * after the cutoff is kept: its end is stale because the event was moved.
 */
const cleanupShifts = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "shifts").where("end", "<", cutoff).get();
  let deleted = 0;

  for (const page of chunk(snapshot.docs, SHIFT_BATCH_SIZE)) {
    const eventIds = uniqueStrings(page.map((shift) => shift.get("eventId")));
    const events = eventIds.length
      ? await db.getAll(...eventIds.map((id) => envCollection(env, "events").doc(id)))
      : [];
    const liveEventIds = new Set(
      events
        .filter((event) => event.exists && (toDate(event.get("end")) ?? cutoff) >= cutoff)
        .map((event) => event.id)
    );
    const shifts = page.filter((shift) => !liveEventIds.has(shift.get("eventId")));
    if (!shifts.length) continue;

    const engagements = await envCollection(env, "engagements")
      .where("shiftId", "in", shifts.map((shift) => shift.id))
      .get();
    await archiveEngagements(env, engagements.docs);

    const batch = db.batch();
    shifts.forEach((shift) => batch.delete(shift.ref));
    await batch.commit();
    deleted += shifts.length;
  }

  return deleted;
};

/**
 * Deletes old engagements whose shift no longer exists. An engagement whose shift is still
 * there is left alone even if its shiftEnd is old, because moving a shift doesn't update the
 * shiftEnd copied onto its engagements; cleanupShifts removes those together with the shift.
 */
const cleanupOrphanedEngagements = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "engagements").where("shiftEnd", "<", cutoff).get();
  let deleted = 0;

  for (const page of chunk(snapshot.docs, ENGAGEMENT_BATCH_SIZE)) {
    const shiftIds = uniqueStrings(page.map((engagement) => engagement.get("shiftId")));
    const shifts = shiftIds.length
      ? await db.getAll(...shiftIds.map((id) => envCollection(env, "shifts").doc(id)))
      : [];
    const existingShiftIds = new Set(shifts.filter((shift) => shift.exists).map((shift) => shift.id));

    const orphans = page.filter((engagement) => !existingShiftIds.has(engagement.get("shiftId")));
    await archiveEngagements(env, orphans);
    deleted += orphans.length;
  }

  return deleted;
};

// Events that still have shifts are kept; those shifts were moved past the cutoff.
const cleanupEvents = async (env: RetentionEnv, cutoff: Date): Promise<number> => {
  const snapshot = await envCollection(env, "events").where("end", "<", cutoff).get();
  let deleted = 0;

  for (const page of chunk(snapshot.docs, EVENT_BATCH_SIZE)) {
    const batch = db.batch();
    for (const event of page) {
      const remainingShifts = await envCollection(env, "shifts")
        .where("eventId", "==", event.id)
        .limit(1)
        .get();
      if (!remainingShifts.empty) continue;

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
      const shifts = await cleanupShifts(env, cutoff);
      const orphanedEngagements = await cleanupOrphanedEngagements(env, cutoff);
      const events = await cleanupEvents(env, cutoff);
      console.log(
        `[${env}] Deleted ${shifts} shifts, ${orphanedEngagements} orphaned engagements and ${events} events that ended before ${cutoff.toISOString()}.`
      );
    }
  }
);
