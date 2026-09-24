// One-off cleanup of profile pictures in Firebase Storage that no user points to.
//
// Before the upload flow deleted the resize extension's copy, replacing a
// profile picture could leave behind:
//   - profile_pictures/resized/<name>_150x200.<ext> for an original that no
//     longer exists or is no longer anyone's photo (old extension, old email)
//   - profile_pictures/<name>.<ext> originals no user references any more
//
// A file is kept if any user document (active or soft-deleted) references it
// through photoUrl, or if it is the resized copy of such a file. Files changed
// in the last hour are skipped so an upload in progress is never touched.
//
// Dry run by default. Pass --apply to actually delete.
//
//   node scripts/cleanup-orphaned-profile-pictures.ts \
//     --credentials path/to/service-account.json [--bucket <name>] [--apply]
//
// Credentials fall back to FIREBASE_SERVICE_ACCOUNT, then ./.credentials.json,
// like the migration runner. The bucket defaults to <project_id>.firebasestorage.app,
// then <project_id>.appspot.com.

import fs from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const PREFIX = "profile_pictures/";
const RESIZED_PREFIX = `${PREFIX}resized/`;
const RESIZED_SUFFIX = "_150x200";
const MIN_AGE_MS = 60 * 60 * 1000;

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const apply = args.includes("--apply");

const loadServiceAccount = (): { project_id: string } => {
  const credentialsPath = getArg("--credentials");
  if (credentialsPath) return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  return JSON.parse(fs.readFileSync("./.credentials.json", "utf8"));
};

// Mirrors buildResizedPath in src/firebase/api/authentication.ts
const buildResizedPath = (fullPath: string): string => {
  const lastSlash = fullPath.lastIndexOf("/");
  const dir = lastSlash >= 0 ? fullPath.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? fullPath.slice(lastSlash + 1) : fullPath;
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex >= 0 ? filename.slice(dotIndex) : "";
  return `${dir}/resized/${base}${RESIZED_SUFFIX}${extension}`;
};

// Extract the object path from a Firebase Storage download URL, e.g.
// https://firebasestorage.googleapis.com/v0/b/<bucket>/o/profile_pictures%2Fa%40b.png?alt=media&token=...
const storagePathFromUrl = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const marker = "/o/";
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(pathname.slice(index + marker.length));
  } catch {
    return null;
  }
};

const main = async () => {
  const serviceAccount = loadServiceAccount();
  const app = initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
  const db = getFirestore(app);
  const storage = getStorage(app);

  const candidateBuckets = getArg("--bucket")
    ? [getArg("--bucket") as string]
    : [`${serviceAccount.project_id}.firebasestorage.app`, `${serviceAccount.project_id}.appspot.com`];
  let bucket = null;
  for (const name of candidateBuckets) {
    const [exists] = await storage.bucket(name).exists();
    if (exists) {
      bucket = storage.bucket(name);
      break;
    }
  }
  if (!bucket) throw new Error(`No bucket found, tried: ${candidateBuckets.join(", ")}. Pass --bucket.`);
  console.log(`Bucket: ${bucket.name}`);
  console.log(apply ? "Mode: APPLY (files will be deleted)" : "Mode: dry run (pass --apply to delete)");

  const keep = new Set<string>();
  let referenced = 0;
  const usersSnap = await db.collection("users").get();
  for (const userDoc of usersSnap.docs) {
    const photoUrl = userDoc.get("photoUrl");
    if (typeof photoUrl !== "string" || !photoUrl) continue;
    const path = storagePathFromUrl(photoUrl);
    if (!path) continue;
    referenced++;
    keep.add(path);
    keep.add(buildResizedPath(path));
  }
  console.log(`Users: ${usersSnap.size}, users with a stored profile picture: ${referenced}`);

  const [files] = await bucket.getFiles({ prefix: PREFIX });
  const now = Date.now();
  const orphans = files.filter((file) => {
    if (file.name.endsWith("/")) return false;
    if (keep.has(file.name)) return false;
    const updated = Date.parse(String(file.metadata.updated ?? ""));
    if (!Number.isNaN(updated) && now - updated < MIN_AGE_MS) return false;
    return true;
  });

  const resizedCount = orphans.filter((file) => file.name.startsWith(RESIZED_PREFIX)).length;
  const totalBytes = orphans.reduce((sum, file) => sum + Number(file.metadata.size ?? 0), 0);
  console.log(`Files under ${PREFIX}: ${files.length}`);
  console.log(
    `Orphaned: ${orphans.length} (${resizedCount} resized, ${orphans.length - resizedCount} originals), ` +
      `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
  );
  for (const file of orphans) console.log(`  ${file.name}`);

  if (!apply || orphans.length === 0) return;

  let failed = 0;
  for (const file of orphans) {
    try {
      await file.delete({ ignoreNotFound: true });
    } catch (error) {
      failed++;
      console.error(`Failed to delete ${file.name}: ${(error as Error).message}`);
    }
  }
  console.log(`Deleted ${orphans.length - failed}/${orphans.length} files.`);
  if (failed > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
