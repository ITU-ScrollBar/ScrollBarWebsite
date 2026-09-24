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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const toApplicationFilePayload = async (file: File, label: string) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`The ${label} must be 10 MB or smaller.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return {
    name: file.name,
    contentType: file.type,
    base64: btoa(binary),
  };
};

// Applicants are not signed in, so the upload goes through a Cloud Function
// instead of writing to Storage from the browser.
export const submitApplication = async (payload: SubmitApplicationPayload) => {
  if (!payload.photoFile.type.startsWith("image/")) {
    throw new Error("The photo upload must be an image file.");
  }

  const [file, photoFile] = await Promise.all([
    toApplicationFilePayload(payload.file, "application file"),
    toApplicationFilePayload(payload.photoFile, "photo"),
  ]);

  const callable = httpsCallable<Record<string, unknown>, { id: string }>(
    functions,
    "submitApplication"
  );

  const result = await callable({
    env,
    fullName: payload.fullName,
    email: payload.email,
    studyline: payload.studyline,
    comment: payload.comment ?? "",
    file,
    photoFile,
  });

  return result.data;
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
