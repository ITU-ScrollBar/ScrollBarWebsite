// context/InternalEventContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import { InternalEvent, InternalEventCreateParams } from "../types/types-file";
import useInternalEvents from "../hooks/useInternalEvents";

export interface InternalEventContextType {
  internalEventState: {
    loading: boolean;
    isLoaded: boolean;
    internalEvents: (InternalEvent & { key: string })[];
  };
  addInternalEvent: (internalEvent: InternalEventCreateParams) => Promise<any>;
  removeInternalEvent: (internalEvent: InternalEvent) => Promise<void>;
  updateInternalEvent: (internalEvent: InternalEvent) => Promise<void>;
}

const InternalEventContext = createContext<InternalEventContextType | undefined>(undefined);

export const InternalEventProvider = ({ children }: { children: ReactNode }) => {
  const { internalEventState, addInternalEvent, removeInternalEvent, updateInternalEvent } =
    useInternalEvents();

  const value = useMemo(
    () => ({
      internalEventState,
      addInternalEvent,
      removeInternalEvent,
      updateInternalEvent,
    }),
    [internalEventState, addInternalEvent, removeInternalEvent, updateInternalEvent]
  );

  return (
    <InternalEventContext.Provider value={value}>{children}</InternalEventContext.Provider>
  );
};

export const useInternalEventContext = () => {
  const context = useContext(InternalEventContext);
  if (!context) {
    throw new Error("useInternalEventContext must be used within an InternalEventProvider");
  }
  return context;
};
