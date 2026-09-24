import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Applicants are not signed in, and the Storage rules reject unauthenticated writes.
// Application files can be large videos, too big to pass through a function, so the
// upload happens in two steps:
//   1. startApplication validates the form and opens a resumable upload session per
//      file. The session URL is the only credential the browser gets, and it only
//      allows writing that one object.
//   2. The browser PUTs each file to its session URL, then calls completeApplication,
//      which checks the uploaded objects and creates the application document.

type ApplicationFileInfo = {
  name?: string;
  contentType?: string;
  size?: number;
};

type StartApplicationRequest = {
  env?: string;
  fullName?: string;
  email?: string;
  studyline?: string;
  comment?: string;
  file?: ApplicationFileInfo;
  photoFile?: ApplicationFileInfo;
};

type StartApplicationResponse = {
  uploadId: string;
  applicationFileUploadUrl: string;
  photoUploadUrl: string;
};

type CompleteApplicationRequest = {
  env?: string;
  uploadId?: string;
};

type CompleteApplicationResponse = {
  id: string;
};

type PendingApplicationUpload = {
  fullName: string;
  email: string;
  studyline: string;
  comment: string;
  applicationFilePath: string;
  photoPath: string;
  createdAt: admin.firestore.Timestamp;
};

const ALLOWED_ENVS = ["dev", "prod"];
const MAX_APPLICATION_FILE_BYTES = 1024 * 1024 * 1024;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
// Upload sessions and pending records older than this can no longer be completed.
const UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  admin.initializeApp(
    serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : {}
  );
}

const db = admin.firestore();

const resolveStorageBucketName = (): string | undefined => {
  const firebaseConfigRaw = process.env.FIREBASE_CONFIG;
  if (firebaseConfigRaw) {
    try {
      const parsed = JSON.parse(firebaseConfigRaw) as { storageBucket?: string };
      if (parsed.storageBucket) return parsed.storageBucket;
    } catch {
      // Ignore malformed FIREBASE_CONFIG and fall back.
    }
  }
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_APP_FIREBASE_STORAGE_BUCKET;
};

const getBucket = () => admin.storage().bucket(resolveStorageBucketName());

const resolveEnv = (value?: string): string => {
  const env = (value ?? "").trim();
  if (!ALLOWED_ENVS.includes(env)) {
    throw new HttpsError("invalid-argument", "env is invalid.");
  }
  return env;
};

const getPendingUploadsCollection = (env: string) =>
  db.collection("env").doc(env).collection("applicationUploads");

const requireString = (value: unknown, field: string, maxLength: number): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is missing or too long.`);
  }
  return trimmed;
};

const getExtension = (name: string): string => {
  const basename = name.split(/[\\/]/).pop() || "";
  const pos = basename.lastIndexOf(".");
  if (pos < 1) return "";
  return basename.slice(pos + 1).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
};

const formatLimit = (bytes: number): string =>
  bytes >= 1024 * 1024 * 1024 ? `${bytes / (1024 * 1024 * 1024)} GB` : `${bytes / (1024 * 1024)} MB`;

const validateFileInfo = (
  info: ApplicationFileInfo | undefined,
  label: string,
  maxBytes: number
): { contentType: string; extension: string } => {
  const size = info?.size;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    throw new HttpsError("invalid-argument", `The ${label} is missing or empty.`);
  }
  if (size > maxBytes) {
    throw new HttpsError("invalid-argument", `The ${label} must be ${formatLimit(maxBytes)} or smaller.`);
  }

  const contentType = typeof info?.contentType === "string"
    && /^[\w.+-]+\/[\w.+-]+$/.test(info.contentType)
    ? info.contentType
    : "application/octet-stream";

  return {
    contentType,
    extension: getExtension(typeof info?.name === "string" ? info.name : ""),
  };
};

const assertSignupWindowOpen = async (): Promise<void> => {
  const settings = (await db.doc("settings/settings").get()).data();
  const start = new Date(settings?.openForSignupsStart ?? "");
  const end = new Date(settings?.openForSignupsEnd ?? "");
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || now < start || now > end) {
    throw new HttpsError("failed-precondition", "The application round is closed.");
  }
};

const deleteStoragePaths = async (paths: string[]): Promise<void> => {
  const bucket = getBucket();
  await Promise.all(
    paths.map((path) =>
      bucket.file(path).delete({ ignoreNotFound: true }).catch((error) => {
        console.error("applications: failed deleting upload", path, error);
      })
    )
  );
};

export const startApplication = onCall(
  { region: "europe-west1", cors: true, invoker: "public" },
  async (
    request: CallableRequest<StartApplicationRequest>
  ): Promise<StartApplicationResponse> => {
    const env = resolveEnv(request.data?.env);
    const fullName = requireString(request.data?.fullName, "Full name", 200);
    const email = requireString(request.data?.email, "Email", 320);
    const studyline = requireString(request.data?.studyline, "Study line", 200);
    const comment = typeof request.data?.comment === "string"
      ? request.data.comment.slice(0, 5000)
      : "";

    if (!/^[^\s@]+@itu\.dk$/i.test(email)) {
      throw new HttpsError("invalid-argument", "Please use your ITU email address.");
    }

    const applicationFile = validateFileInfo(
      request.data?.file,
      "application file",
      MAX_APPLICATION_FILE_BYTES
    );
    const photoFile = validateFileInfo(request.data?.photoFile, "photo", MAX_PHOTO_BYTES);
    if (!photoFile.contentType.startsWith("image/")) {
      throw new HttpsError("invalid-argument", "The photo upload must be an image file.");
    }

    await assertSignupWindowOpen();

    const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const buildPath = (fileTag: string, extension: string) =>
      `applications/${env}/${Date.now()}-${safeEmail}-${fileTag}${extension ? `.${extension}` : ""}`;
    const applicationFilePath = buildPath("application", applicationFile.extension);
    const photoPath = buildPath("photo", photoFile.extension);

    // The session URL must be created for the page's origin, or the browser's PUT fails CORS.
    const origin = request.rawRequest.headers.origin;
    const bucket = getBucket();

    try {
      const [[applicationFileUploadUrl], [photoUploadUrl]] = await Promise.all([
        bucket.file(applicationFilePath).createResumableUpload({
          origin,
          metadata: { contentType: applicationFile.contentType },
        }),
        bucket.file(photoPath).createResumableUpload({
          origin,
          metadata: { contentType: photoFile.contentType },
        }),
      ]);

      const pendingRef = await getPendingUploadsCollection(env).add({
        fullName,
        email,
        studyline,
        comment,
        applicationFilePath,
        photoPath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        uploadId: pendingRef.id,
        applicationFileUploadUrl,
        photoUploadUrl,
      };
    } catch (error) {
      console.error("startApplication: failed", error);
      throw new HttpsError("internal", "Could not start the upload. Please try again.");
    }
  }
);

export const completeApplication = onCall(
  { region: "europe-west1", cors: true, invoker: "public" },
  async (
    request: CallableRequest<CompleteApplicationRequest>
  ): Promise<CompleteApplicationResponse> => {
    const env = resolveEnv(request.data?.env);
    const uploadId = requireString(request.data?.uploadId, "uploadId", 128);

    const pendingRef = getPendingUploadsCollection(env).doc(uploadId);
    const pending = (await pendingRef.get()).data() as PendingApplicationUpload | undefined;
    if (!pending) {
      throw new HttpsError("not-found", "This upload has expired. Please submit the application again.");
    }

    const paths = [pending.applicationFilePath, pending.photoPath];
    const createdAtMs = pending.createdAt?.toMillis?.() ?? 0;
    if (Date.now() - createdAtMs > UPLOAD_WINDOW_MS) {
      await deleteStoragePaths(paths);
      await pendingRef.delete();
      throw new HttpsError("deadline-exceeded", "This upload has expired. Please submit the application again.");
    }

    const bucket = getBucket();
    const readSize = async (path: string): Promise<number | null> => {
      const [exists] = await bucket.file(path).exists();
      if (!exists) return null;
      const [metadata] = await bucket.file(path).getMetadata();
      return Number(metadata.size ?? 0);
    };

    const [applicationFileSize, photoSize] = await Promise.all(paths.map(readSize));
    if (!applicationFileSize || !photoSize) {
      throw new HttpsError("failed-precondition", "The files have not finished uploading. Please try again.");
    }
    if (applicationFileSize > MAX_APPLICATION_FILE_BYTES || photoSize > MAX_PHOTO_BYTES) {
      await deleteStoragePaths(paths);
      await pendingRef.delete();
      throw new HttpsError("invalid-argument", "An uploaded file is larger than allowed.");
    }

    const applicationRef = db.collection("env").doc(env).collection("applications").doc();
    await db.runTransaction(async (transaction) => {
      // Re-read inside the transaction so a double submit creates only one application.
      if (!(await transaction.get(pendingRef)).exists) {
        throw new HttpsError("already-exists", "This application has already been submitted.");
      }
      transaction.set(applicationRef, {
        fullName: pending.fullName,
        email: pending.email,
        studyline: pending.studyline,
        comment: pending.comment,
        applicationFilePath: pending.applicationFilePath,
        photoPath: pending.photoPath,
        decision: "pending",
        emailDeliveryStatus: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.delete(pendingRef);
    });

    return { id: applicationRef.id };
  }
);
