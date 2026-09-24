import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Applicants are not signed in, so their uploads go through this function (Admin SDK)
// instead of writing to Storage directly from the browser, where the Storage rules
// reject unauthenticated writes.

type ApplicationFilePayload = {
  name?: string;
  contentType?: string;
  base64?: string;
};

type SubmitApplicationRequest = {
  env?: string;
  fullName?: string;
  email?: string;
  studyline?: string;
  comment?: string;
  file?: ApplicationFilePayload;
  photoFile?: ApplicationFilePayload;
};

type SubmitApplicationResponse = {
  id: string;
};

type DecodedFile = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

const ALLOWED_ENVS = ["dev", "prod"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

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

const decodeFile = (payload: ApplicationFilePayload | undefined, label: string): DecodedFile => {
  if (!payload || typeof payload.base64 !== "string" || !payload.base64) {
    throw new HttpsError("invalid-argument", `The ${label} is missing.`);
  }

  const buffer = Buffer.from(payload.base64, "base64");
  if (!buffer.length) {
    throw new HttpsError("invalid-argument", `The ${label} is empty.`);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new HttpsError("invalid-argument", `The ${label} must be 10 MB or smaller.`);
  }

  const contentType = typeof payload.contentType === "string"
    && /^[\w.+-]+\/[\w.+-]+$/.test(payload.contentType)
    ? payload.contentType
    : "application/octet-stream";

  return {
    buffer,
    contentType,
    extension: getExtension(typeof payload.name === "string" ? payload.name : ""),
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

export const submitApplication = onCall(
  { region: "europe-west1", cors: true, invoker: "public", memory: "512MiB" },
  async (
    request: CallableRequest<SubmitApplicationRequest>
  ): Promise<SubmitApplicationResponse> => {
    const env = (request.data?.env ?? "").trim();
    if (!ALLOWED_ENVS.includes(env)) {
      throw new HttpsError("invalid-argument", "env is invalid.");
    }

    const fullName = requireString(request.data?.fullName, "Full name", 200);
    const email = requireString(request.data?.email, "Email", 320);
    const studyline = requireString(request.data?.studyline, "Study line", 200);
    const comment = typeof request.data?.comment === "string"
      ? request.data.comment.slice(0, 5000)
      : "";

    if (!/^[^\s@]+@itu\.dk$/i.test(email)) {
      throw new HttpsError("invalid-argument", "Please use your ITU email address.");
    }

    const applicationFile = decodeFile(request.data?.file, "application file");
    const photoFile = decodeFile(request.data?.photoFile, "photo");
    if (!photoFile.contentType.startsWith("image/")) {
      throw new HttpsError("invalid-argument", "The photo upload must be an image file.");
    }

    await assertSignupWindowOpen();

    const bucket = admin.storage().bucket(resolveStorageBucketName());
    const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const buildPath = (fileTag: string, extension: string) =>
      `applications/${env}/${Date.now()}-${safeEmail}-${fileTag}${extension ? `.${extension}` : ""}`;

    const applicationFilePath = buildPath("application", applicationFile.extension);
    const photoPath = buildPath("photo", photoFile.extension);
    const uploadedPaths: string[] = [];

    try {
      await bucket.file(applicationFilePath).save(applicationFile.buffer, {
        contentType: applicationFile.contentType,
        resumable: false,
      });
      uploadedPaths.push(applicationFilePath);

      await bucket.file(photoPath).save(photoFile.buffer, {
        contentType: photoFile.contentType,
        resumable: false,
      });
      uploadedPaths.push(photoPath);

      const docRef = await db.collection("env").doc(env).collection("applications").add({
        fullName,
        email,
        studyline,
        comment,
        applicationFilePath,
        photoPath,
        decision: "pending",
        emailDeliveryStatus: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { id: docRef.id };
    } catch (error) {
      await Promise.all(
        uploadedPaths.map((path) =>
          bucket.file(path).delete({ ignoreNotFound: true }).catch((cleanupError) => {
            console.error("submitApplication: failed deleting partial upload", path, cleanupError);
          })
        )
      );
      console.error("submitApplication: failed", error);
      throw new HttpsError("internal", "Failed to submit application. Nothing was saved, please try again.");
    }
  }
);
