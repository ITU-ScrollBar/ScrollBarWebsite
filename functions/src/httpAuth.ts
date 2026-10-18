import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { Role, Tender } from './types/types-file';

// Safe admin init (prevents multiple inits when this module is loaded before calendar.ts).
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  admin.initializeApp(serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : {});
}
const db = admin.firestore();

export const resolveEnv = (): string => process.env.VITE_APP_ENV || 'dev';

export const ensureBoardAccess = async (uid: string): Promise<boolean> => {
  const user = (await db.collection('users').doc(uid).get()).data() as Tender | undefined;
  return Boolean(user?.isAdmin || user?.roles?.includes(Role.BOARD));
};

const verifyBearerToken = async (req: Request): Promise<string | null> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (error) {
    // An expired or malformed token is a client problem, so it must not surface as a 500.
    console.warn('verifyBearerToken: rejected token', error);
    return null;
  }
};

/**
 * Resolves the caller's uid, or writes a 401 and returns null. Route handlers should return
 * immediately when this yields null.
 */
export const authenticateRequest = async (req: Request, res: Response): Promise<string | null> => {
  const uid = await verifyBearerToken(req);

  if (!uid) {
    res.status(401).send('Missing or invalid authentication token');
    return null;
  }

  return uid;
};

const hasBoardRole = async (uid: string): Promise<boolean> => {
  const user = (await db.collection('users').doc(uid).get()).data() as Tender | undefined;
  return Boolean(user?.roles?.includes(Role.BOARD));
};

/**
 * Same as authenticateRequest, but also requires the BOARD role itself. Unlike ensureBoardAccess,
 * a site admin without that role is refused, which keeps the form responses endpoints in step with
 * the /admin/forms route guard. The anonymous feedback inbox is the reason for the stricter rule.
 */
export const authenticateBoardMemberRequest = async (
  req: Request,
  res: Response
): Promise<string | null> => {
  const uid = await authenticateRequest(req, res);

  if (!uid) {
    return null;
  }

  if (!(await hasBoardRole(uid))) {
    res.status(403).send('Insufficient permissions');
    return null;
  }

  return uid;
};
