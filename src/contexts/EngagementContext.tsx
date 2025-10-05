// context/EngagementContext.tsx

import React, { createContext, useMemo, useContext, ReactNode } from "react";
import useEngagements from "../hooks/useEngagements";
import { Engagement, EngagementState } from "../types/types-file";
import { DocumentData } from "firebase/firestore";

// Define the context type
export interface EngagementContextType {
  engagementState: EngagementState;
  addEngagement: (engagement: Engagement) => Promise<DocumentData>;
  removeEngagement: (engagement: Engagement) => Promise<void>;
  takeShift: (id: string, userId: string) => Promise<void>;
  setUpForGrabs: (id: string, status: boolean) => Promise<void>;
}

// Create the context
const EngagementContext = createContext<EngagementContextType | undefined>(
  undefined
);

// Create the provider
export const EngagementProvider = ({ children }: { children: ReactNode }) => {
  const {
    engagementState,
    addEngagement,
    removeEngagement,
    takeShift,
    setUpForGrabs,
  } = useEngagements();

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      engagementState,
      addEngagement,
      removeEngagement,
      takeShift,
      setUpForGrabs,
    }),
    [engagementState, addEngagement, removeEngagement, takeShift, setUpForGrabs]
  );

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
};

// Custom hook for using the context
export const useEngagementContext = () => {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error(
      "useEngagementContext must be used within an EngagementProvider"
    );
  }
  return context;
};
