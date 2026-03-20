import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  onSnapshot,
  getDocs,
  setDoc,
  DocumentData,
  Unsubscribe,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '..';
import { Tender } from '../../types/types-file';
import { DocumentReference } from 'firebase/firestore';

const env = import.meta.env.VITE_APP_ENV as string;

// Reference to the roles collection in the current environment
const getRolesCollection = () =>
  collection(doc(collection(db, 'env'), env), 'boardRoles');

// Helper to get a user document reference
export const getUserRef = (userId: string): DocumentReference =>
  doc(collection(db, 'users'), userId);

export const streamRoles = (next: (snapshot: QuerySnapshot<DocumentData>) => void, error: (error: Error) => void): Unsubscribe => {
  const q = query(getRolesCollection());
  return onSnapshot(q, next, error);
};

export const addRole = async (role: { name: string }) => {
  const data: any = { name: role.name };
  return addDoc(getRolesCollection(), data);
};


/**
 * Update a board role. If assignedUser is provided, stores a reference to the user.
 */
export const updateRole = async (
  id: string,
  data: Partial<{ name: string; assignedUser: Tender; sortingIndex: number }>
) => {
  const docRef = doc(getRolesCollection(), id);
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.assignedUser?.uid !== undefined) {
    updateData.assignedUserRef = data.assignedUser.uid ? getUserRef(data.assignedUser.uid) : null;
  }
  if (data.sortingIndex !== undefined) {
    updateData.sortingIndex = data.sortingIndex;
  }
  return updateDoc(docRef, updateData);
};

export const deleteRole = async (id: string) => {
  const docRef = doc(getRolesCollection(), id);
  return deleteDoc(docRef);
};
