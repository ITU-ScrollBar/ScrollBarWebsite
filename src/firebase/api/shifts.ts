import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '..';
import { Shift } from '../../types/types-file';

const env = import.meta.env.VITE_APP_ENV as string;

type Observer = {
  next: (snapshot: QuerySnapshot<DocumentData>) => void;
  error: (error: Error) => void;
};

const getShiftsCollection = () =>
  collection(doc(collection(db, 'env'), env), 'shifts');

export const createShift = (shift: Shift): Promise<DocumentData> => {
  return addDoc(getShiftsCollection(), shift);
};

export const deleteShift = (shift: Shift): Promise<void> => {
  const docRef = doc(getShiftsCollection(), shift.id!);
  return deleteDoc(docRef);
};

export const updateShift = ({
  id,
  field,
  value,
}: {
  id: string;
  field: string;
  value: any;
}): Promise<void> => {
  const docRef = doc(getShiftsCollection(), id);
  return updateDoc(docRef, { [field]: value });
};

// ✅ Fixed: pass next and error separately
export const streamShifts = ({ next, error }: Observer): Unsubscribe => {
  const q = query(getShiftsCollection(), orderBy('start', 'asc'));
  return onSnapshot(q, next, error);
};
