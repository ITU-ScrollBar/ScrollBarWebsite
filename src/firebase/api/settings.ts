import {
  doc,
  onSnapshot,
  updateDoc,
  DocumentSnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db, storage } from '..';
import { getExtension } from './common';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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

export const uploadFile = async (
  file: File,
  settingsKey: string
): Promise<string> => {
  const date = new Date();
  const extension = getExtension(file.name);
  const storageRef = ref(storage, `assets/${date.toISOString().slice(0, 10)}-${settingsKey}.${extension}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  return await getDownloadURL(storageRef);
};
