import {
  addDoc,
  collection,
  deleteDoc,
  DocumentData,
  DocumentSnapshot,
  doc,
  writeBatch,
  onSnapshot,
  orderBy,
  QuerySnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  ref,
} from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "../index";

const env = import.meta.env.VITE_APP_ENV as string;

const getApplicationsCollection = () =>
  collection(doc(collection(db, "env"), env), "applications");

const getRoundMetaRef = () =>
  doc(collection(doc(collection(db, "env"), env), "meta"), "applications");

type SubmitApplicationPayload = {
  fullName: string;
  email: string;
  studyline: string;
  comment: string;
  file: File;
  photoFile: File;
};

type QueueRejectedEmailPayload = {
  id: string;
  email: string;
  fullName: string;
  bodyText?: string;
};

type QueueApplicationInvitePayload = {
  id: string;
  email: string;
  fullName?: string;
  studyline?: string;
  bodyText?: string;
};

export type QueueEmailResult = {
  successful: string[];
  failed: Array<{ id: string; email: string; error: unknown }>;
};

type QueueTemplateTestEmailPayload = {
  templateType: "invite" | "rejection";
  email: string;
  fullName: string;
  bodyText?: string;
  studyline?: string;
};

const MAX_APPLICATION_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

type StartApplicationResult = {
  uploadId: string;
  applicationFileUploadUrl: string;
  photoUploadUrl: string;
};

const getContentType = (file: File) => file.type || "application/octet-stream";

const toFileInfo = (file: File) => ({
  name: file.name,
  contentType: getContentType(file),
  size: file.size,
});

// XMLHttpRequest rather than fetch, because fetch cannot report upload progress.
const uploadToSession = (
  uploadUrl: string,
  file: File,
  onProgress: (loadedBytes: number) => void
) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", getContentType(file));
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        reject(new Error(`Uploading ${file.name} failed (${xhr.status}). Please try again.`));
      }
    };
    xhr.onerror = () =>
      reject(new Error(`Uploading ${file.name} failed. Check your connection and try again.`));
    xhr.send(file);
  });

// Applicants are not signed in, so a Cloud Function opens upload sessions for the
// files, the browser uploads straight to them, and a second call files the application.
export const submitApplication = async (
  payload: SubmitApplicationPayload,
  onProgress?: (percent: number) => void
) => {
  if (!payload.photoFile.type.startsWith("image/")) {
    throw new Error("The photo upload must be an image file.");
  }
  if (payload.file.size > MAX_APPLICATION_FILE_BYTES) {
    throw new Error("The application file must be 2 GB or smaller.");
  }
  if (payload.photoFile.size > MAX_PHOTO_BYTES) {
    throw new Error("The photo must be 25 MB or smaller.");
  }

  const startApplication = httpsCallable<Record<string, unknown>, StartApplicationResult>(
    functions,
    "startApplication"
  );
  const completeApplication = httpsCallable<{ env: string; uploadId: string }, { id: string }>(
    functions,
    "completeApplication"
  );

  const { data: session } = await startApplication({
    env,
    fullName: payload.fullName,
    email: payload.email,
    studyline: payload.studyline,
    comment: payload.comment ?? "",
    file: toFileInfo(payload.file),
    photoFile: toFileInfo(payload.photoFile),
  });

  const totalBytes = payload.file.size + payload.photoFile.size;
  const loaded = { file: 0, photo: 0 };
  const reportProgress = () =>
    onProgress?.(Math.min(100, Math.round(((loaded.file + loaded.photo) / totalBytes) * 100)));

  await Promise.all([
    uploadToSession(session.applicationFileUploadUrl, payload.file, (bytes) => {
      loaded.file = bytes;
      reportProgress();
    }),
    uploadToSession(session.photoUploadUrl, payload.photoFile, (bytes) => {
      loaded.photo = bytes;
      reportProgress();
    }),
  ]);

  const { data } = await completeApplication({ env, uploadId: session.uploadId });
  return data;
};

export const streamApplications = (
  next: (snapshot: QuerySnapshot<DocumentData>) => void,
  error: (error: Error) => void
) => {
  const q = query(getApplicationsCollection(), orderBy("createdAt", "asc"));
  return onSnapshot(q, next, error);
};

export const updateApplicationDecision = async (
  id: string,
  decision: "maybe" | "accept" | "reject"
) => {
  return updateDoc(doc(getApplicationsCollection(), id), {
    decision,
  });
};

export const streamApplicationRoundMeta = (
  next: (snapshot: DocumentSnapshot<DocumentData>) => void,
  error: (error: Error) => void
) => {
  return onSnapshot(getRoundMetaRef(), next, error);
};

export const submitApplicationRound = async (submittedByUid: string) => {
  return setDoc(getRoundMetaRef(), {
    submittedAt: serverTimestamp(),
    submittedByUid,
  }, { merge: true });
};

export const queueRejectedApplicationEmails = async (rejections: QueueRejectedEmailPayload[]): Promise<QueueEmailResult> => {
  const collectionRef = collection(doc(collection(db, "env"), env), "applicationRejectionEmails");

  const results = await Promise.allSettled(
    rejections.map((rejection) =>
      addDoc(collectionRef, {
        applicationId: rejection.id,
        email: rejection.email,
        fullName: rejection.fullName,
        bodyText: rejection.bodyText ?? "",
        createdAt: serverTimestamp(),
      })
    )
  );

  const successful: string[] = [];
  const failed: Array<{ id: string; email: string; error: unknown }> = [];

  results.forEach((result, index) => {
    const rejection = rejections[index];
    if (result.status === "fulfilled") {
      successful.push(rejection.id);
    } else {
      failed.push({ id: rejection.id, email: rejection.email, error: result.reason });
    }
  });

  return { successful, failed };
};

export const queueApplicationInviteEmails = async (
  invites: QueueApplicationInvitePayload[]
): Promise<QueueEmailResult> => {
  const collectionRef = collection(doc(collection(db, "env"), env), "applicationInviteEmails");

  const results = await Promise.allSettled(
    invites.map((invite) =>
      addDoc(collectionRef, {
        applicationId: invite.id,
        email: invite.email,
        fullName: invite.fullName ?? "",
        studyline: invite.studyline ?? "",
        bodyText: invite.bodyText ?? "",
        createdAt: serverTimestamp(),
      })
    )
  );

  const successful: string[] = [];
  const failed: Array<{ id: string; email: string; error: unknown }> = [];

  results.forEach((result, index) => {
    const invite = invites[index];
    if (result.status === "fulfilled") {
      successful.push(invite.id);
    } else {
      failed.push({ id: invite.id, email: invite.email, error: result.reason });
    }
  });

  return { successful, failed };
};

export const updateApplicationEmailDeliveryStatuses = async (
  updates: Array<{
    id: string;
    emailDeliveryStatus: "pending" | "success" | "failed";
  }>
) => {
  if (!updates.length) return;

  const batch = writeBatch(db);
  updates.forEach((update) => {
    const docRef = doc(getApplicationsCollection(), update.id);
    const payload: Record<string, string> = {
      emailDeliveryStatus: update.emailDeliveryStatus,
    };
    batch.update(docRef, payload);
  });

  await batch.commit();
};

export const queueTemplateTestEmail = async (payload: QueueTemplateTestEmailPayload) => {
  const collectionRef = collection(doc(collection(db, "env"), env), "emailTemplateTests");
  return addDoc(collectionRef, {
    templateType: payload.templateType,
    email: payload.email,
    fullName: payload.fullName,
    bodyText: payload.bodyText ?? "",
    studyline: payload.studyline ?? "",
    createdAt: serverTimestamp(),
  });
};

export const resetAndDeleteApplicationRound = async (
  applications: Array<{ id: string; applicationFilePath: string; photoPath: string }>
) => {
  for (const application of applications) {
    try {
      await deleteObject(ref(storage, application.applicationFilePath));
    } catch (error) {
      console.error("Failed deleting application file", error);
    }
    try {
      await deleteObject(ref(storage, application.photoPath));
    } catch (error) {
      console.error("Failed deleting applicant photo", error);
    }
    await deleteDoc(doc(getApplicationsCollection(), application.id));
  }

  try {
    await deleteDoc(getRoundMetaRef());
  } catch (error) {
    console.error("Failed deleting application round metadata", error);
  }
};
