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

// Users are global but their shifts live under both envs, and whichever branch deployed last
// owns the functions, so the cleanup always covers both envs rather than just VITE_APP_ENV.
export const RETENTION_ENVS = ["prod", "dev"] as const;
export type RetentionEnv = (typeof RETENTION_ENVS)[number];

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

const isNotFound = (error: unknown) => (error as { code?: number }).code === 404;

/**
 * Deletes the Storage object behind a Firebase download URL
 * (https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?...).
 * A missing file counts as deleted; anything else is rethrown.
 */
export const deleteStorageFileByUrl = async (url: unknown): Promise<void> => {
  const match = typeof url === "string" && url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  if (!match) return;

  try {
    await getStorage().bucket(match[1]).file(decodeURIComponent(match[2])).delete();
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
};
