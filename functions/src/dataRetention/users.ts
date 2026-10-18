import { getAuth, UserRecord } from "firebase-admin/auth";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  IS_PROD_BUILD,
  RETENTION_ENVS,
  SCHEDULE_OPTIONS,
  USER_INACTIVITY_MONTHS,
  db,
  envCollection,
  monthsAgo,
} from "./common";
import { deleteUserCompletely } from "./userDeletion";

// lastSignInTime only moves on an actual sign-in, so someone who stays logged in on their phone
// would look inactive; lastRefreshTime moves every time the app refreshes their ID token.
const lastActiveAt = (user: UserRecord): Date => {
  const { creationTime, lastSignInTime, lastRefreshTime } = user.metadata;
  const times = [creationTime, lastSignInTime, lastRefreshTime]
    .filter((time): time is string => !!time)
    .map((time) => new Date(time).getTime())
    .filter((time) => !isNaN(time));
  return new Date(Math.max(0, ...times));
};

const listInactiveAuthUids = async (cutoff: Date): Promise<string[]> => {
  const inactive: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    inactive.push(...page.users.filter((user) => lastActiveAt(user) < cutoff).map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  return inactive;
};

// Users soft-deleted before deletion became a hard delete ("Deleted User" docs with
// active: false), including the ones migrations 002/003 produced.
const listSoftDeletedUids = async (): Promise<string[]> => {
  const snapshot = await db.collection("users").where("active", "==", false).get();
  return snapshot.docs.map((doc) => doc.id);
};

// Engagements still on record are recent or upcoming shifts (older ones are removed by
// cleanupOldShiftsAndEvents), and those still show the user's name, so the user waits for them.
const hasEngagements = async (uid: string): Promise<boolean> => {
  for (const env of RETENTION_ENVS) {
    const count = await envCollection(env, "engagements").where("userId", "==", uid).count().get();
    if (count.data().count > 0) return true;
  }
  return false;
};

/**
 * Monthly: deletes users who haven't signed in for USER_INACTIVITY_MONTHS and users that were
 * soft-deleted, see deleteUserCompletely. Users are global, so this only runs in a prod build
 * (see IS_PROD_BUILD).
 */
export const cleanupInactiveUsers = onSchedule(
  // 1st of the month at 04:00
  { ...SCHEDULE_OPTIONS, schedule: "0 4 1 * *" },
  async () => {
    if (!IS_PROD_BUILD) {
      console.log("Skipping inactive user cleanup: users are global and this is not a prod build.");
      return;
    }

    const cutoff = monthsAgo(USER_INACTIVITY_MONTHS);
    const candidates = new Set([...(await listInactiveAuthUids(cutoff)), ...(await listSoftDeletedUids())]);
    const deleted: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const uid of candidates) {
      try {
        if (await hasEngagements(uid)) {
          skipped.push(uid);
          continue;
        }
        await deleteUserCompletely(uid);
        deleted.push(uid);
      } catch (error) {
        failed.push(`${uid}: ${error}`);
      }
    }

    console.log(
      `Deleted ${deleted.length} users that were soft-deleted or inactive since before ${cutoff.toISOString()}.` +
        (deleted.length ? `\n${deleted.join("\n")}` : "")
    );
    if (skipped.length) {
      console.log(`Kept ${skipped.length} users who still have shifts:\n${skipped.join("\n")}`);
    }
    if (failed.length) console.warn(`Failed to delete ${failed.length} users:\n${failed.join("\n")}`);
  }
);
