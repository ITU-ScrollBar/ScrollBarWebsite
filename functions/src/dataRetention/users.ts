import { getAuth, UserRecord } from "firebase-admin/auth";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  RETENTION_ENVS,
  SCHEDULE_OPTIONS,
  USER_INACTIVITY_MONTHS,
  db,
  deleteStorageFileByUrl,
  envCollection,
  monthsAgo,
} from "./common";

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

const listInactiveAuthUsers = async (cutoff: Date): Promise<UserRecord[]> => {
  const inactive: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    inactive.push(...page.users.filter((user) => lastActiveAt(user) < cutoff));
    pageToken = page.pageToken;
  } while (pageToken);
  return inactive;
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
 * Daily: deletes users who haven't signed in for USER_INACTIVITY_MONTHS, removing their
 * profile picture, their users/{uid} doc and their Auth account, in that order, so a failed run
 * never leaves a picture without the doc that points at it.
 */
export const cleanupInactiveUsers = onSchedule(
  { ...SCHEDULE_OPTIONS, schedule: "every day 04:00" },
  async () => {
    const cutoff = monthsAgo(USER_INACTIVITY_MONTHS);
    const candidates = await listInactiveAuthUsers(cutoff);
    const deleted: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const authUser of candidates) {
      const { uid } = authUser;
      try {
        if (await hasEngagements(uid)) {
          skipped.push(uid);
          continue;
        }

        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();
        await deleteStorageFileByUrl(userDoc.get("photoUrl"));
        await userRef.delete();
        await getAuth().deleteUser(uid);
        deleted.push(uid);
      } catch (error) {
        failed.push(`${uid}: ${error}`);
      }
    }

    console.log(
      `Deleted ${deleted.length} users inactive since before ${cutoff.toISOString()}.` +
        (deleted.length ? `\n${deleted.join("\n")}` : "")
    );
    if (skipped.length) {
      console.log(`Kept ${skipped.length} inactive users who still have shifts:\n${skipped.join("\n")}`);
    }
    if (failed.length) console.warn(`Failed to delete ${failed.length} users:\n${failed.join("\n")}`);
  }
);
