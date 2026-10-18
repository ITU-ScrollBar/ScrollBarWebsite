// functions/src/index.ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { getAuth } from "firebase-admin/auth";
import { Role, Tender } from "./types/types-file";
import { deleteUserCompletely, hasUpcomingEngagements } from "./dataRetention/userDeletion";

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
  { region: "europe-west1" },
  async (req: CallableRequest<ChangeEmailData>) => {
    // Must be signed in
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    // Authorize caller (example: custom claim on the caller)
    const caller = (await db.doc(`users/${req.auth.uid}`).get()).data() as Tender;
    if (!(caller.isAdmin || caller.roles?.includes(Role.TENDER_MANAGER))) {
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

type DeleteUserData = {
  targetUid: string;
};

// Roles that can reach a "delete tender" button (admin/users and admin/shifts).
const USER_DELETION_ROLES: string[] = [Role.BOARD, Role.SHIFT_MANAGER, Role.TENDER_MANAGER];

/**
 * Deletes a user entirely (users doc, Auth account, profile pictures and references), replacing
 * the old client-side soft delete that left a "Deleted User" doc behind.
 */
export const adminDeleteUser = onCall(
  { region: "europe-west1" },
  async (req: CallableRequest<DeleteUserData>) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const caller = (await db.doc(`users/${req.auth.uid}`).get()).data() as Tender | undefined;
    if (!(caller?.isAdmin || caller?.roles?.some((role) => USER_DELETION_ROLES.includes(role)))) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    const { targetUid } = req.data ?? ({} as DeleteUserData);
    if (!targetUid || typeof targetUid !== "string") {
      throw new HttpsError("invalid-argument", "targetUid is required");
    }
    if (targetUid === req.auth.uid) {
      throw new HttpsError("failed-precondition", "You can't delete yourself");
    }
    if (await hasUpcomingEngagements(targetUid)) {
      throw new HttpsError("failed-precondition", "Remove the user from their upcoming shifts first");
    }

    await deleteUserCompletely(targetUid);
    return { ok: true };
  }
);
