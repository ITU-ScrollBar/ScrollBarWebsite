import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  orderBy,
  query,
  onSnapshot,
  where,
  writeBatch,
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

const getEngagementsCollection = () =>
  collection(doc(collection(db, 'env'), env), 'engagements');

export const createShift = (shift: Shift): Promise<string> => {
  return addDoc(getShiftsCollection(), shift).then((ref) => ref.id);
};

export const deleteShift = async (shift: Shift): Promise<void> => {
  const docRef = doc(getShiftsCollection(), shift.id!);

  const engagementSnapshot = await getDocs(
    query(getEngagementsCollection(), where('shiftId', '==', shift.id))
  );

  const batch = writeBatch(db);
  batch.delete(docRef);

  for (const engagementDoc of engagementSnapshot.docs) {
    batch.delete(engagementDoc.ref);
  }

  await batch.commit();
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
