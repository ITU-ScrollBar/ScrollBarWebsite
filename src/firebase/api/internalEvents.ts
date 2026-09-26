import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '..';
import { InternalEvent, InternalEventCreateParams } from '../../types/types-file';

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
 * Streams internal events that haven't ended yet. Past ones are never shown
 * (useInternalEvents drops them too), so there's no point downloading them.
 */
export const streamInternalEvents = (observer: { next: (snapshot: QuerySnapshot<DocumentData>) => void; error: (error: Error) => void }): Unsubscribe => {
  const eventsRef = collection(db, 'env', env, 'internalEvents');
  const q = query(eventsRef, where('end', '>=', new Date()));

  // Return the unsubscribe function from onSnapshot
  return onSnapshot(q, observer.next, observer.error);
};
