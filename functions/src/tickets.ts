import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  Role,
  Tender,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
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

type ListTicketsRequest = {
  env?: string;
};

type ListTicketsResponse = {
  tickets: {
    id: string;
    title: string;
    description: string;
    department: TicketDepartment;
    requestType: TicketRequestType;
    impact: TicketImpact;
    status: TicketStatus;
    createdByUid?: string;
    createdAtMs?: number;
    updatedAtMs?: number;
  }[];
};

type UpdateTicketStatusRequest = {
  id?: string;
  status?: TicketStatus;
  env?: string;
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

const assertBoardAccess = async (uid: string): Promise<void> => {
  const caller = (await db.doc(`users/${uid}`).get()).data() as Tender | undefined;

  const hasBoardAccess = Boolean(
    caller?.roles?.includes(Role.BOARD) || caller?.isAdmin
  );

  if (!hasBoardAccess) {
    throw new HttpsError("permission-denied", "Not allowed to access tickets.");
  }
};

const resolveEnv = (value?: string): string => {
  const env = (value ?? "dev").trim();
  if (!isAllowedEnv(env)) {
    throw new HttpsError("invalid-argument", "env is invalid.");
  }
  return env;
};

export const createTicket = onCall(
  { region: "europe-west1", cors: true, invoker: "public" },
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

export const listTickets = onCall(
  { region: "europe-west1", cors: true, invoker: "public" },
  async (request: CallableRequest<ListTicketsRequest>): Promise<ListTicketsResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in to list tickets.");
    }

    await assertBoardAccess(request.auth.uid);
    const env = resolveEnv(request.data?.env);

    const snapshot = await db.collection("env").doc(env).collection("tickets").get();

    const tickets = snapshot.docs
      .map((ticketDoc) => {
        const data = ticketDoc.data() as {
          title?: string;
          description?: string;
          department?: TicketDepartment;
          requestType?: TicketRequestType;
          impact?: TicketImpact;
          status?: TicketStatus;
          createdByRef?: admin.firestore.DocumentReference;
          createdAt?: admin.firestore.Timestamp;
          updatedAt?: admin.firestore.Timestamp;
        };

        return {
          id: ticketDoc.id,
          title: data.title ?? "",
          description: data.description ?? "",
          department: data.department ?? TicketDepartment.IT,
          requestType: data.requestType ?? TicketRequestType.BROKEN,
          impact: data.impact ?? TicketImpact.LOW,
          status: data.status ?? "open",
          createdByUid: data.createdByRef?.id,
          createdAtMs: data.createdAt?.toMillis(),
          updatedAtMs: data.updatedAt?.toMillis(),
        };
      })
      .sort((a, b) => {
        const aDate = a.updatedAtMs ?? a.createdAtMs ?? 0;
        const bDate = b.updatedAtMs ?? b.createdAtMs ?? 0;
        return bDate - aDate;
      });

    return { tickets };
  }
);

export const setTicketStatus = onCall(
  { region: "europe-west1", cors: true, invoker: "public" },
  async (request: CallableRequest<UpdateTicketStatusRequest>): Promise<{ ok: true }> => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to update ticket status."
      );
    }

    await assertBoardAccess(request.auth.uid);

    const id = request.data?.id?.trim();
    const status = request.data?.status;
    const env = resolveEnv(request.data?.env);

    if (!id) {
      throw new HttpsError("invalid-argument", "id is required.");
    }

    if (!["open", "in_progress", "resolved"].includes(status ?? "")) {
      throw new HttpsError("invalid-argument", "status must be a valid value.");
    }

    await db.collection("env").doc(env).collection("tickets").doc(id).set(
      {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true };
  }
);
