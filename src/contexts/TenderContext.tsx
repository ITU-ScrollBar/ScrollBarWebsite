// context/TenderContext.tsx

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { Tender, Invite } from "../types/types-file"; // Ensure this import path is correct
import useTenders from "../hooks/useTenders"; // Assuming this is your custom hook for handling tender data

export interface TenderContextType {
  tenderState: {
    loading: boolean;
    isLoaded: boolean;
    tenders: (Tender)[];
  };
  invitedTenders: (Invite & { key: string })[];
  addInvite: (email: string) => Promise<void>;
  removeInvite: (invite: string) => Promise<void>;
  updateTender: (id: string, field: string, value: any) => Promise<void>;
}

const TenderContext = createContext<TenderContextType | undefined>(undefined);

export const TenderProvider = ({ children }: { children: ReactNode }) => {
  const {
    tenderState,
    invitedTenders,
    addInvite,
    removeInvite,
    updateTender,
  } = useTenders(); // Hook that manages tender data

  const value = useMemo(
    () => ({
      tenderState,
      invitedTenders,
      addInvite,
      removeInvite,
      updateTender,
    }),
    [tenderState, invitedTenders, addInvite, removeInvite, updateTender]
  );

  return <TenderContext.Provider value={value}>{children}</TenderContext.Provider>;
};

export const useTenderContext = () => {
  const context = useContext(TenderContext);
  if (!context) {
    throw new Error("useTenderContext must be used within a TenderProvider");
  }
  return context;
};
