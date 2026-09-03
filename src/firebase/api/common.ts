import {
  collection,
  doc,
  getDocs,
  getDoc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { auth, db } from '../index';
import { DocumentData } from './../../types/types-file';

export const getCollection = async (
  path: string,
  useEnv: boolean
): Promise<DocumentData[]> => {
  const ref: CollectionReference = useEnv
    ? collection(db, 'env', process.env.VITE_APP_ENV as string, path)
    : collection(db, path);

  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    key: doc.id,
    ...doc.data(),
  }));
};

export const getDocument = async (
  collectionPath: string,
  id: string,
  useEnv: boolean
): Promise<DocumentData | null> => {
  const ref: DocumentReference = useEnv
    ? doc(db, 'env', process.env.VITE_APP_ENV as string, collectionPath, id)
    : doc(db, collectionPath, id);

  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? { id: snapshot.id, key: snapshot.id, ...snapshot.data() }
    : null;
};

export const getExtension = (path: string): string => {
  const basename = path.split(/[\\/]/).pop() || '';
  const pos = basename.lastIndexOf('.');
  if (basename === '' || pos < 1) return '';
  return basename.slice(pos + 1);
};
const projectId = import.meta.env.VITE_APP_FIREBASE_PROJECT_ID as string;

// Every express route (tickets, equipment lending, anonymous feedback) is served by the single
// `calendar` cloud function.
export const calendarFunctionUrl = `https://europe-west1-${projectId}.cloudfunctions.net/calendar`;

type CalendarRequestInit = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  unauthenticatedMessage: string;
  failureMessage: string;
};

/**
 * Calls a route on the calendar function with the signed-in user's ID token attached, and turns a
 * non-2xx response into an Error carrying the server's message.
 */
export const callCalendarFunction = async <T>(
  path: string,
  init: CalendarRequestInit
): Promise<T> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error(init.unauthenticatedMessage);
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${calendarFunctionUrl}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || init.failureMessage);
  }

  return (await response.json()) as T;
};
