import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ALL_ENVS, chunk, db, deleteFileIfExists, envCollection, parseStorageUrl } from "./common";

const PROFILE_PICTURE_DIR = "profile_pictures/";
const RESIZED_DIR = `${PROFILE_PICTURE_DIR}resized/`;
// Suffix of the copies the firebase/storage-resize-images extension used to write, see
// deleteProfilePicture in src/firebase/api/authentication.ts.
const RESIZED_SUFFIX = "_150x200";
const BATCH_SIZE = 400;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

/**
 * Removes what points at the user from other documents, so nothing is left referencing a
 * users doc that no longer exists:
 * - board roles assigned to them are unassigned,
 * - their shift planning survey answers (which hold a private email) are deleted,
 * - they are removed from other users' "avoid shifts with" lists.
 * Engagements are not touched: callers only delete users without upcoming shifts, and past
 * ones are removed by cleanupOldShiftsAndEvents. Tickets, lending requests and comments keep
 * the uid as a historical record and already show "Unknown user" for users that don't resolve.
 */
const removeReferences = async (uid: string): Promise<void> => {
  const userRef = db.collection("users").doc(uid);
  const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

  for (const env of ALL_ENVS) {
    const [roles, responses] = await Promise.all([
      envCollection(env, "boardRoles").where("assignedUserRef", "==", userRef).get(),
      envCollection(env, "shiftPlanningResponses").where("userId", "==", uid).get(),
    ]);
    roles.docs.forEach((role) => writes.push((batch) => batch.update(role.ref, { assignedUserRef: null })));
    responses.docs.forEach((response) => writes.push((batch) => batch.delete(response.ref)));
  }

  const avoiding = await db.collection("users").where("avoidShiftWithUserIds", "array-contains", uid).get();
  avoiding.docs.forEach((other) =>
    writes.push((batch) => batch.update(other.ref, { avoidShiftWithUserIds: FieldValue.arrayRemove(uid) }))
  );

  for (const page of chunk(writes, BATCH_SIZE)) {
    const batch = db.batch();
    page.forEach((write) => write(batch));
    await batch.commit();
  }
};

const deleteAuthUser = async (uid: string): Promise<void> => {
  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
};

/** True if the user is on any shift that hasn't ended yet, in any env. */
export const hasUpcomingEngagements = async (uid: string): Promise<boolean> => {
  for (const env of ALL_ENVS) {
    const count = await envCollection(env, "engagements")
      .where("userId", "==", uid)
      .where("shiftEnd", ">=", new Date())
      .count()
      .get();
    if (count.data().count > 0) return true;
  }
  return false;
};

/**
 * Deletes a user entirely: profile pictures, references to them, their invite (so they can be
 * invited and register again later), their users/{uid} doc and their Auth account, in that
 * order. Every step can be re-run, and the Auth account goes last, so a failure part-way
 * leaves the user findable for the next attempt.
 */
export const deleteUserCompletely = async (uid: string): Promise<void> => {
  const userRef = db.collection("users").doc(uid);
  const [userDoc, authUser] = await Promise.all([
    userRef.get(),
    getAuth().getUser(uid).catch((error) => {
      if ((error as { code?: string }).code === "auth/user-not-found") return null;
      throw error;
    }),
  ]);
  const emails = [...new Set([authUser?.email, userDoc.get("email")])].filter(
    (email): email is string => typeof email === "string" && !!email
  );

  await deleteProfilePictures(emails, userDoc.get("photoUrl"));
  await removeReferences(uid);
  await Promise.all(emails.map((email) => db.collection("invites").doc(email).delete()));
  await userRef.delete();
  await deleteAuthUser(uid);
};
