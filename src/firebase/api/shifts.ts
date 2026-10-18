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
  QueryDocumentSnapshot,
  Unsubscribe,
  documentId,
} from 'firebase/firestore';
import { db } from '..';
import { Shift } from '../../types/types-file';
import { getLiveDataWindowStart } from './dataWindow';
import { streamWhereIn } from './streamWhereIn';

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

// Bounded to the rolling live-data window: every consumer of this stream
// filters down to a specific event or planning period, so streaming the full
// shift history only ever added reads and latency.
export const streamShifts = ({ next, error }: Observer): Unsubscribe => {
  const q = query(
    getShiftsCollection(),
    where('start', '>=', getLiveDataWindowStart()),
    orderBy('start', 'asc')
  );
  return onSnapshot(q, next, error);
};

/**
 * Streams the given shifts by id.
 */
export const streamShiftsByIds = (
  ids: string[],
  onNext: (docs: QueryDocumentSnapshot<DocumentData>[]) => void,
  onError: (error: Error) => void
): Unsubscribe => streamWhereIn(getShiftsCollection(), documentId(), ids, onNext, onError);
