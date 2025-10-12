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
import { Event, EventCreateParams } from '../../types/types-file'; // Assuming you define your Event type here

const env =import.meta.env.VITE_APP_ENV as string;

/**
 * Returns reference to the events collection.
 */
const getEventsCollection = () =>
  collection(doc(collection(db, 'env'), env), 'events');

/**
 * Creates a new event.
 */
export const createEvent = (event: EventCreateParams): Promise<DocumentData> => {
  return addDoc(getEventsCollection(), event);
};

/**
 * Deletes an event by ID.
 */
export const deleteEvent = (event: Event): Promise<void> => {
  const docRef = doc(getEventsCollection(), event.id!);
  return deleteDoc(docRef);
};

/**
 * Updates a specific field of an event.
 */
export const updateEvent = ({
  id,
  field,
  value,
}: {
  id: string;
  field: string;
  value: any;
}): Promise<void> => {
  const docRef = doc(getEventsCollection(), id);
  return updateDoc(docRef, { [field]: value });
};

/**
 * Streams events ordered by start date.
 */

export const streamEvents = (observer: { next: (snapshot: QuerySnapshot<DocumentData>) => void; error: (error: Error) => void }): Unsubscribe => {
  const eventsRef = collection(db, 'env', env, 'events');
  console.log("Streaming events from env:", env);
  const q = query(eventsRef); // Add any additional filters or ordering as needed

  // Return the unsubscribe function from onSnapshot
  return onSnapshot(q, observer.next, observer.error);
};
