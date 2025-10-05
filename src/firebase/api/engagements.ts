import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { Engagement } from '../../types/types-file'; // Define your Engagement type separately
import { db } from '../index';

const env = import.meta.env.VITE_APP_ENV as string;


/**
 * Streams real-time engagements where shiftEnd is in the future.
 */
export const streamEngagements = (
  onNext: (snapshot: QuerySnapshot<DocumentData>) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const engagementsRef = collection(doc(collection(db, 'env'), env), 'engagements');
  const q = query(engagementsRef, where('shiftEnd', '>=', new Date()), orderBy('shiftEnd', 'asc'));
  return onSnapshot(q, onNext, onError);
};


/**
 * Assigns a shift to a user.
 */
export const takeShift = (id: string, userId: string): Promise<void> => {
  const docRef = doc(collection(doc(collection(db, 'env'), env), 'engagements'), id);
  return updateDoc(docRef, { userId, upForGrabs: false });
};

/**
 * Updates the upForGrabs status of a shift.
 */
export const setUpForGrabs = (id: string, status: boolean): Promise<void> => {
  const docRef = doc(collection(doc(collection(db, 'env'), env), 'engagements'), id);
  return updateDoc(docRef, { upForGrabs: status });
};

/**
 * Deletes an engagement.
 */
export const deleteEngagement = (engagement: Engagement): Promise<void> => {
  const docRef = doc(collection(doc(collection(db, 'env'), env), 'engagements'), engagement.id!);
  return deleteDoc(docRef);
};

/**
 * Creates a new engagement.
 */
export const createEngagement = (engagement: Engagement): Promise<DocumentData> => {
  const collectionRef = collection(doc(collection(db, 'env'), env), 'engagements');
  return addDoc(collectionRef, engagement);
};
