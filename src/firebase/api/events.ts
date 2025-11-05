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
  limit,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db, storage } from '..';
import { EventCreateParams } from '../../types/types-file'; // Assuming you define your Event type here
import { getExtension } from './common';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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
export const deleteEvent = (id: string): Promise<void> => {
  const docRef = doc(getEventsCollection(), id);
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
  const q = query(eventsRef); // Add any additional filters or ordering as needed

  // Return the unsubscribe function from onSnapshot
  return onSnapshot(q, observer.next, observer.error);
};

/**
 * Streams only the most recent/next upcoming event ordered by start date.
 */
export const streamNextEvent = (observer: { next: (snapshot: QuerySnapshot<DocumentData>) => void; error: (error: Error) => void }): Unsubscribe => {
  const eventsRef = collection(db, 'env', env, 'events');
  const now = Timestamp.now();
  const q = query(
    eventsRef,
    where('end', '>', now),
    where('published', '==', true),
    orderBy('start', 'asc'),
    limit(1)
  );
  return onSnapshot(q, observer.next, observer.error);
};

export const uploadEventPicture = async (
  picture: File,
  eventId: string
): Promise<string> => {
  const extension = getExtension(picture.name);
  const storageRef = ref(storage, `event_pictures/${eventId}.${extension}`);
  await uploadBytes(storageRef, picture, {
    contentType: picture.type,
    customMetadata: { eventId },
  });
  return await getDownloadURL(storageRef);
};

// Delete event picture from storage when new picture is uploaded
export const deleteFileFromStorage = async (filePath: string): Promise<void> => {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
};