// context/ShiftContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import { DocumentData } from "firebase/firestore";
import { Shift } from "../types/types-file"; // Ensure this is the correct import
import useShifts from "../hooks/useShifts"; // Assuming this is your hook

export interface ShiftContextType {
  shiftState: {
    loading: boolean;
    isLoaded: boolean;
    shifts: Shift[];
  };
  addShift: (shift: Shift) => Promise<DocumentData>;
  removeShift: (shift: Shift) => Promise<void>;
  updateShift: (id: string, field: string, value: any) => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider = ({ children }: { children: ReactNode }) => {
  const { shiftState, addShift, removeShift, updateShift } = useShifts();

  const value = useMemo(
    () => ({
      shiftState,
      addShift,
      removeShift,
      updateShift,
    }),
    [shiftState, addShift, removeShift, updateShift]
  );

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
};

export const useShiftContext = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error("useShiftContext must be used within a ShiftProvider");
  }
  return context;
};
