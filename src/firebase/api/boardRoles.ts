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

const env = import.meta.env.VITE_APP_ENV as string;

// Reference to the roles collection in the current environment
const getRolesCollection = () =>
  collection(doc(collection(db, 'env'), env), 'boardRoles');

export const streamRoles = (next: (snapshot: QuerySnapshot<DocumentData>) => void, error: (error: Error) => void): Unsubscribe => {
  const q = query(getRolesCollection());
  return onSnapshot(q, next, error);
};

export const addRole = async (role: { name: string }) => {
  return addDoc(getRolesCollection(), role);
};

export const updateRole = async (id: string, data: Partial<{ name: string; assignedUser: Tender }>) => {
  const docRef = doc(getRolesCollection(), id);
  return updateDoc(docRef, data);
};

export const deleteRole = async (id: string) => {
  const docRef = doc(getRolesCollection(), id);
  return deleteDoc(docRef);
};
