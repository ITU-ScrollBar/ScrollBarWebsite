import {
  doc,
  onSnapshot,
  updateDoc,
  DocumentSnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '..';

/**
 * Type for Firestore snapshot observer
 */
type Observer = (snapshot: DocumentSnapshot<DocumentData>) => void;

/**
 * Reference to the single settings document
 */
const settingsDocRef = doc(db, 'settings', 'settings');

/**
 * Streams the settings document
 */
export const streamSettings = (observer: Observer): Unsubscribe => {
  return onSnapshot(settingsDocRef, observer);
};

/**
 * Updates a specific field in the settings document
 */
export const updateSettings = (field: string, value: any): Promise<void> => {
  return updateDoc(settingsDocRef, { [field]: value });
};
