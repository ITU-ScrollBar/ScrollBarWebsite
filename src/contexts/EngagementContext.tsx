// context/EngagementContext.tsx

import React, { createContext, useMemo, useContext, ReactNode } from "react";
import useEngagements from "../hooks/useEngagements";
import { useRequestStream, useStreamRequest } from "../hooks/useStreamRequest";
import { Engagement, EngagementState } from "../types/types-file";
import { DocumentData } from "firebase/firestore";

// Define the context type
export interface EngagementContextType {
  engagementState: EngagementState;
  addEngagement: (engagement: Engagement) => Promise<DocumentData>;
  removeEngagement: (engagement: Engagement) => Promise<void>;
  takeShift: (id: string, userId: string) => Promise<void>;
  setUpForGrabs: (id: string, status: boolean) => Promise<void>;
  getProfileData: (uid: string) => Promise<{ firstShift: Date; shiftCount: number } | null>;
  requestStream: () => void;
}

type ConsumerOptions = {
  // false for components that only call actions and don't read the streamed state
  stream?: boolean;
};


// Create the context
const EngagementContext = createContext<EngagementContextType | undefined>(
  undefined
);

// Create the provider
export const EngagementProvider = ({ children }: { children: ReactNode }) => {
  const { requested, request } = useStreamRequest();
  const {
    engagementState,
    addEngagement,
    removeEngagement,
    takeShift,
    setUpForGrabs,
    getProfileData,
  } = useEngagements(requested);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      engagementState,
      addEngagement,
      removeEngagement,
      takeShift,
      setUpForGrabs,
      getProfileData,
      requestStream: request,
    }),
    [engagementState, addEngagement, removeEngagement, takeShift, setUpForGrabs, getProfileData, request]
  );

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
};

// Custom hook for using the context
export const useEngagementContext = ({ stream = true }: ConsumerOptions = {}) => {
  const context = useContext(EngagementContext);
  useRequestStream(context?.requestStream, stream);
  if (!context) {
    throw new Error(
      "useEngagementContext must be used within an EngagementProvider"
    );
  }
  return context;
};
