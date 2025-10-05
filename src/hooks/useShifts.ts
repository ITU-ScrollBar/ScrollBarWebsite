import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createShift,
  deleteShift,
  streamShifts,
  updateShift as update,
} from '../firebase/api/shifts'; // Adjust the import path as necessary
import { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Shift } from '../types/types-file'; // Ensure you have Shift type defined

export const sortShifts = (a:Shift, b:Shift) => {
    if (a.start > b.start) {
      return 1;
    } else if (a.start < b.start) {
      return -1;
    } else {
      return 0;
    }
  };

  

interface ShiftState {
  loading: boolean;
  isLoaded: boolean;
  shifts: Shift[];
}

const useShifts = () => {
  const [shiftState, setShiftState] = useState<ShiftState>({
    loading: false,
    isLoaded: false,
    shifts: [],
  });

  useEffect(() => {
    setShiftState((prevState) => ({
      ...prevState,
      loading: true,
    }));

    const unsubscribe = streamShifts({
      next: (snapshot: QuerySnapshot<DocumentData>) => {
        const updatedShifts: Shift[] = snapshot.docs
          .map((doc) => {
            return { ...doc.data(), id: doc.id, key: doc.id } as Shift;
          })
          .sort(sortShifts);

        setShiftState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: true,
          shifts: updatedShifts,
        }));
      },
      error: (error: Error) => {
        message.error('An error occurred: ' + error.message);
        setShiftState((prevState) => ({
          ...prevState,
          loading: false,
        }));
      },
    });

    return unsubscribe;
  }, []);

  const addShift = (shift: Shift): Promise<DocumentData> => {
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
