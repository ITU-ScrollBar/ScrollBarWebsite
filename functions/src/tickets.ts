import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
} from "./types/types-file";

type CreateTicketRequest = {
  title?: string;
  description?: string;
  department?: TicketDepartment;
  requestType?: TicketRequestType;
  impact?: TicketImpact;
  env?: string;
};

type CreateTicketResponse = {
  id: string;
};

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  admin.initializeApp(
    serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : {}
  );
}

const db = admin.firestore();

const isAllowedEnv = (value: string): boolean => /^[a-z0-9_-]{1,32}$/i.test(value);

export const createTicket = onCall(
  { region: "europe-west1", cors: true },
  async (request: CallableRequest<CreateTicketRequest>): Promise<CreateTicketResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in to create a ticket.");
    }

    const title = request.data?.title?.trim() ?? "";
    const description = request.data?.description?.trim() ?? "";
    const department = request.data?.department;
    const requestType = request.data?.requestType;
    const impact = request.data?.impact;
    const env = (request.data?.env ?? "dev").trim();

    if (!title || title.length > 120) {
      throw new HttpsError("invalid-argument", "title must be between 1 and 120 characters.");
    }

    if (!description || description.length < 10 || description.length > 1500) {
      throw new HttpsError(
        "invalid-argument",
        "description must be between 10 and 1500 characters."
      );
    }

    if (!Object.values(TicketDepartment).includes(department as TicketDepartment)) {
      throw new HttpsError("invalid-argument", "department must be a valid value.");
    }

    if (!Object.values(TicketRequestType).includes(requestType as TicketRequestType)) {
      throw new HttpsError("invalid-argument", "requestType must be a valid value.");
    }

    if (!Object.values(TicketImpact).includes(impact as TicketImpact)) {
      throw new HttpsError("invalid-argument", "impact must be a valid value.");
    }

    if (!isAllowedEnv(env)) {
      throw new HttpsError("invalid-argument", "env is invalid.");
    }

    const creatorUid = request.auth.uid;
    const creatorRef = db.doc(`users/${creatorUid}`);

    const docRef = await db.collection("env").doc(env).collection("tickets").add({
      title,
      description,
      department,
      requestType,
      impact,
      status: "open",
      createdByRef: creatorRef,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: docRef.id };
  }
);
