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
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../index";
import { getExtension } from "./common";

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

export type QueueEmailResult = {
  successful: string[];
  failed: Array<{ id: string; email: string; error: unknown }>;
};

type QueueTemplateTestEmailPayload = {
  templateType: "invite" | "rejection";
  email: string;
  fullName: string;
  bodyText?: string;
};

const uploadApplicationFile = async (file: File, applicantEmail: string, fileTag: string) => {
  const extension = getExtension(file.name);
  const extensionSuffix = extension ? `.${extension}` : "";
  const safeEmail = applicantEmail.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const path = `applications/${env}/${Date.now()}-${safeEmail}-${fileTag}${extensionSuffix}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  return { path };
};

const safeDeleteStoragePath = async (path?: string) => {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.error("Failed deleting partially uploaded file", error);
  }
};

export const submitApplication = async (payload: SubmitApplicationPayload) => {
  let uploadedApplicationPath: string | undefined;
  let uploadedPhotoPath: string | undefined;

  try {
    const uploaded = await uploadApplicationFile(payload.file, payload.email, "application");
    uploadedApplicationPath = uploaded.path;

    const uploadedPhoto = await uploadApplicationFile(payload.photoFile, payload.email, "photo");
    uploadedPhotoPath = uploadedPhoto.path;

    return await addDoc(getApplicationsCollection(), {
      fullName: payload.fullName,
      email: payload.email,
      studyline: payload.studyline,
      comment: payload.comment ?? "",
      applicationFilePath: uploadedApplicationPath,
      photoPath: uploadedPhotoPath,
      decision: "pending",
      emailDeliveryStatus: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    await Promise.all([
      safeDeleteStoragePath(uploadedApplicationPath),
      safeDeleteStoragePath(uploadedPhotoPath),
    ]);
    throw error;
  }
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
