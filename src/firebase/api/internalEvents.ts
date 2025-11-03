import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '..';
import { InternalEvent, InternalEventCreateParams, InternalEventUpdateParams } from '../../types/types-file'; // Assuming you define your Event type here

const env =import.meta.env.VITE_APP_ENV as string;

/**
 * Returns reference to the internal events collection.
 */
const getInternalEventsCollection = () =>
  collection(doc(collection(db, 'env'), env), 'internalEvents');

/**
 * Creates a new internal event.
 */
export const createInternalEvent = (internalEvent: InternalEventCreateParams): Promise<DocumentData> => {
  return addDoc(getInternalEventsCollection(), internalEvent);
};

/**
 * Deletes an internal event by ID.
 */
export const deleteInternalEvent = (internalEvent: InternalEvent): Promise<void> => {
  const docRef = doc(getInternalEventsCollection(), internalEvent.id);
  return deleteDoc(docRef);
};

/**
 * Updates a specific field of an internal event.
 */
export const updateInternalEvent = ({
  id,
  description,
  end,
  start,
  location,
  scope,
  title,
}: InternalEvent): Promise<void> => {
  const docRef = doc(getInternalEventsCollection(), id);
  return updateDoc(docRef, { description, end, start, location, scope, title });
};

/**
 * Streams internal events ordered by start date.
 */
export const streamInternalEvents = (observer: { next: (snapshot: QuerySnapshot<DocumentData>) => void; error: (error: Error) => void }): Unsubscribe => {
  const eventsRef = collection(db, 'env', env, 'internalEvents');
  const q = query(eventsRef);

  // Return the unsubscribe function from onSnapshot
  return onSnapshot(q, observer.next, observer.error);
};
