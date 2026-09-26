// context/ShiftContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import { Shift } from "../types/types-file"; // Ensure this is the correct import
import useShifts from "../hooks/useShifts"; // Assuming this is your hook
import { useRequestStream, useStreamRequest } from "../hooks/useStreamRequest";

export interface ShiftContextType {
  shiftState: {
    loading: boolean;
    isLoaded: boolean;
    shifts: Shift[];
  };
  addShift: (shift: Shift) => Promise<string>;
  removeShift: (shift: Shift) => Promise<void>;
  updateShift: (id: string, field: string, value: any) => Promise<void>;
  requestStream: () => void;
}

type ConsumerOptions = {
  // false for components that only call actions and don't read the streamed state
  stream?: boolean;
};


const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider = ({ children }: { children: ReactNode }) => {
  const { requested, request } = useStreamRequest();
  const { shiftState, addShift, removeShift, updateShift } = useShifts(requested);

  const value = useMemo(
    () => ({
      shiftState,
      addShift,
      removeShift,
      updateShift,
      requestStream: request,
    }),
    [shiftState, addShift, removeShift, updateShift, request]
  );

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
};

export const useShiftContext = ({ stream = true }: ConsumerOptions = {}) => {
  const context = useContext(ShiftContext);
  useRequestStream(context?.requestStream, stream);
  if (!context) {
    throw new Error("useShiftContext must be used within a ShiftProvider");
  }
  return context;
};
