import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createShift,
  deleteShift,
  streamShifts,
  updateShift as update,
} from '../firebase/api/shifts'; // Adjust the import path as necessary
import { QuerySnapshot, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { Shift } from '../types/types-file'; // Ensure you have Shift type defined

type FirebaseShift = {
  id: string;
  eventId: string;
  location: string;
  title: string;
  tenders: number;
  start: Timestamp;
  end: Timestamp;
}

export const sortShifts = (a:Shift, b:Shift) => {
  if (a.start > b.start) {
    return 1;
  } else if (a.start < b.start) {
    return -1;
  } else {
    return 0;
  }
};

  

export const toShift = (doc: QueryDocumentSnapshot<DocumentData>): Shift => {
  const data = doc.data() as FirebaseShift;
  return {
    ...data,
    id: doc.id,
    key: doc.id,
    start: data.start?.toDate(),
    end: data.end?.toDate(),
  } as Shift;
};

interface ShiftState {
  loading: boolean;
  isLoaded: boolean;
  shifts: Shift[];
}

// `enabled` stays false until a component actually reads this data (see
// useStreamRequest), so routes that don't need it never download it.
const useShifts = (enabled: boolean) => {
  const [shiftState, setShiftState] = useState<ShiftState>({
    loading: true,
    isLoaded: false,
    shifts: [],
  });

  useEffect(() => {
    if (!enabled) return;
    setShiftState((prevState) => ({
      ...prevState,
      loading: true,
    }));

    const unsubscribe = streamShifts({
      next: (snapshot: QuerySnapshot<DocumentData>) => {
        const updatedShifts: Shift[] = snapshot.docs.map(toShift).sort(sortShifts);

        setShiftState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: true,
          shifts: updatedShifts,
        }));
      },
      error: (error: Error) => {
        message.error('An error occurred loading shifts: ' + error.message);
        setShiftState((prevState) => ({
          ...prevState,
          loading: false,
        }));
      },
    });

    return unsubscribe;
  }, [enabled]);

  const addShift = (shift: Shift): Promise<string> => {
    return createShift(shift);
  };

  const removeShift = (shift: Shift): Promise<void> => {
    return deleteShift(shift);
  };

  const updateShift = (id: string, field: string, value: any): Promise<void> => {
    return update({
      id,
      field,
      value,
    });
  };

  return { shiftState, addShift, removeShift, updateShift };
};

export default useShifts;
