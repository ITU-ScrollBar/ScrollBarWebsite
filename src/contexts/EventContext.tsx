// context/EventContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import { Event, EventCreateParams } from "../types/types-file";
import useEvents from "../hooks/useEvents";
import { useRequestStream, useStreamRequest } from "../hooks/useStreamRequest";

// Context type definition
export interface EventContextType {
  eventState: {
    loading: boolean;
    isLoaded: boolean;
    events: (Event & { key: string })[];
    previousEvents: (Event & { key: string })[];
  };
  addEvent: (event: EventCreateParams) => Promise<string>;
  removeEvent: (id: string) => Promise<void>;
  updateEvent: (id: string, field: string, value: any) => Promise<void>;
  requestStream: () => void;
}

type ConsumerOptions = {
  // false for components that only call actions and don't read the streamed state
  stream?: boolean;
};


// Create the context
const EventContext = createContext<EventContextType | undefined>(undefined);

// Provider component
export const EventProvider = ({ children }: { children: ReactNode }) => {
  const { requested, request } = useStreamRequest();
  const { eventState, addEvent, removeEvent, updateEvent } = useEvents(requested);

  const value = useMemo(
    () => ({
      eventState,
      addEvent,
      removeEvent,
      updateEvent,
      requestStream: request,
    }),
    [eventState, addEvent, removeEvent, updateEvent, request]
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
};

// Hook to use the EventContext
export const useEventContext = ({ stream = true }: ConsumerOptions = {}) => {
  const context = useContext(EventContext);
  useRequestStream(context?.requestStream, stream);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
};

export default EventContext;
