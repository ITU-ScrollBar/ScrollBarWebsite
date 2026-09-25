import { getAuth, UserRecord } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  IS_PROD_BUILD,
  RETENTION_ENVS,
  SCHEDULE_OPTIONS,
  USER_INACTIVITY_MONTHS,
  db,
  deleteFileIfExists,
  envCollection,
  monthsAgo,
  parseStorageUrl,
} from "./common";

const PROFILE_PICTURE_DIR = "profile_pictures/";
const RESIZED_DIR = `${PROFILE_PICTURE_DIR}resized/`;
// Suffix of the copies the firebase/storage-resize-images extension used to write, see
// deleteProfilePicture in src/firebase/api/authentication.ts.
const RESIZED_SUFFIX = "_150x200";

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

const toResizedPath = (path: string): string => {
  const filename = path.slice(path.lastIndexOf("/") + 1);
  const dot = filename.lastIndexOf(".");
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const extension = dot >= 0 ? filename.slice(dot) : "";
  return `${RESIZED_DIR}${base}${RESIZED_SUFFIX}${extension}`;
};

/**
 * Deletes every copy of a user's profile picture: the file photoUrl points at, earlier uploads
 * under another extension (migration 006 left the originals in place), and the resize
 * extension's copies of all of them. Pictures are named after the user's email, so any
 * address the user has had (Auth or users doc) is checked.
 */
const deleteProfilePictures = async (emails: string[], photoUrl: unknown): Promise<void> => {
  const fromUrl = parseStorageUrl(photoUrl);
  const bucket = getStorage().bucket(fromUrl?.bucket);
  const paths = new Set<string>(fromUrl ? [fromUrl.path] : []);

  for (const email of emails) {
    // Exact names only: a bare "<email>." prefix would also match "<email>.co.webp".
    const ownPicture = new RegExp(`^${PROFILE_PICTURE_DIR}${escapeRegExp(email)}\\.[^./]+$`);
    const [files] = await bucket.getFiles({ prefix: `${PROFILE_PICTURE_DIR}${email}.` });
    files.filter((file) => ownPicture.test(file.name)).forEach((file) => paths.add(file.name));
  }

  const allPaths = [...paths].flatMap((path) => [path, toResizedPath(path)]);
  await Promise.all(allPaths.map((path) => deleteFileIfExists(bucket, path)));
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes one user: profile pictures, invite, users/{uid} doc and Auth account, in that order,
 * so a failed step leaves the Auth account in place and the next run retries the whole user.
 * The invite is deleted so the person can be invited and register again later.
 */
const deleteUserData = async (authUser: UserRecord): Promise<void> => {
  const userRef = db.collection("users").doc(authUser.uid);
  const userDoc = await userRef.get();
  const emails = [...new Set([authUser.email, userDoc.get("email")])].filter(
    (email): email is string => typeof email === "string" && !!email
  );

  await deleteProfilePictures(emails, userDoc.get("photoUrl"));
  await Promise.all(emails.map((email) => db.collection("invites").doc(email).delete()));
  await userRef.delete();
  await getAuth().deleteUser(authUser.uid);
};

/**
 * Monthly: deletes users who haven't signed in for USER_INACTIVITY_MONTHS. Users are global, so
 * this only runs in a prod build (see IS_PROD_BUILD).
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
    const candidates = await listInactiveAuthUsers(cutoff);
    const deleted: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const authUser of candidates) {
      try {
        if (await hasEngagements(authUser.uid)) {
          skipped.push(authUser.uid);
          continue;
        }
        await deleteUserData(authUser);
        deleted.push(authUser.uid);
      } catch (error) {
        failed.push(`${authUser.uid}: ${error}`);
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
