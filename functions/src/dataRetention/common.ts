import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

// Safe admin init (prevents multiple inits during local tests)
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  admin.initializeApp(serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : {});
}

export const db = admin.firestore();

type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

// Pushes to both main and dev deploy these functions to the same project, so only a prod build
// is trusted with prod data and with the global users collection. A dev build only cleans dev.
// A prod build also cleans dev, because users are global and their shifts live under both envs.
export const IS_PROD_BUILD = (process.env.VITE_APP_ENV || "dev") === "prod";
export type RetentionEnv = "prod" | "dev";
export const RETENTION_ENVS: RetentionEnv[] = IS_PROD_BUILD ? ["prod", "dev"] : ["dev"];
// Every env that can hold references to a (global) user.
export const ALL_ENVS: RetentionEnv[] = ["prod", "dev"];

export const SHIFT_RETENTION_MONTHS = 6;
export const USER_INACTIVITY_MONTHS = 14;

export const SCHEDULE_OPTIONS = {
  region: "europe-west1",
  timeZone: "Europe/Copenhagen",
  timeoutSeconds: 540,
  memory: "512MiB",
} as const;

export const monthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

export const envCollection = (env: RetentionEnv, name: string) =>
  db.collection("env").doc(env).collection(name);

export const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

/**
 * Splits a Firebase download URL
 * (https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?...) into its parts.
 */
export const parseStorageUrl = (url: unknown): { bucket: string; path: string } | null => {
  const match = typeof url === "string" && url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
};

/** Deletes a Storage object. A missing file counts as deleted; anything else is rethrown. */
export const deleteFileIfExists = async (bucket: Bucket, path: string): Promise<void> => {
  try {
    await bucket.file(path).delete();
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
  }
};

export const deleteStorageFileByUrl = async (url: unknown): Promise<void> => {
  const parsed = parseStorageUrl(url);
  if (parsed) await deleteFileIfExists(getStorage().bucket(parsed.bucket), parsed.path);
};
