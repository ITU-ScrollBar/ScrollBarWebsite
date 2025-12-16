// functions/src/index.ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { getAuth } from "firebase-admin/auth";
import { Role, Tender } from "./types/types-file";

type ChangeEmailData = {
  targetUid: string;
  newEmail: string;
};

// Safe admin init (prevents multiple inits during local tests)
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  admin.initializeApp(serviceAccount ? {credential: admin.credential.cert(serviceAccount)} : {});
}

const db = admin.firestore();

export const adminChangeUserEmail = onCall(
  async (req: CallableRequest<ChangeEmailData>) => {
    // Must be signed in
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    // Authorize caller (example: custom claim on the caller)
    const caller = (await db.doc(`users/${req.auth.uid}`).get()).data() as Tender;
    if (!caller.roles?.includes(Role.ADMIN)) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    const { targetUid, newEmail } = req.data ?? ({} as ChangeEmailData);

    if (!targetUid || typeof targetUid !== "string") {
      throw new HttpsError("invalid-argument", "targetUid is required");
    }
    if (!newEmail || typeof newEmail !== "string") {
      throw new HttpsError("invalid-argument", "newEmail is required");
    }

    await getAuth().updateUser(targetUid, { email: newEmail });

    return { ok: true };
  }
);
