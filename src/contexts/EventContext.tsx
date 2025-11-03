// context/EventContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import { DocumentData } from "firebase/firestore";
import { Event, EventCreateParams } from "../types/types-file";
import useEvents from "../hooks/useEvents"; // You already have this

// Context type definition
export interface EventContextType {
  eventState: {
    loading: boolean;
    isLoaded: boolean;
    events: (Event & { key: string })[];
    previousEvents: (Event & { key: string })[];
  };
  addEvent: (event: EventCreateParams) => Promise<DocumentData>;
  removeEvent: (id: string) => Promise<void>;
  updateEvent: (id: string, field: string, value: any) => Promise<void>;
}

// Create the context
const EventContext = createContext<EventContextType | undefined>(undefined);

// Provider component
export const EventProvider = ({ children }: { children: ReactNode }) => {
  const { eventState, addEvent, removeEvent, updateEvent } = useEvents();

  const value = useMemo(
    () => ({
      eventState,
      addEvent,
      removeEvent,
      updateEvent,
    }),
    [eventState, addEvent, removeEvent, updateEvent]
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
};

// Hook to use the EventContext
export const useEventContext = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
};

export default EventContext;
