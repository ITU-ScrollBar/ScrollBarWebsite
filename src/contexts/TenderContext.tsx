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
  addInvites: (
    recipients: Array<{ id: string; email: string; fullName?: string; studyline?: string }>,
    bodyText?: string
  ) => Promise<{
    successful: string[];
    failed: Array<{ id: string; email: string; error: unknown }>;
  }>;
  removeInvite: (invite: string) => Promise<void>;
  updateTender: (id: string, field: string, value: any) => Promise<void>;
  deleteTender: (id: string) => void;
}

const TenderContext = createContext<TenderContextType | undefined>(undefined);

export const TenderProvider = ({ children }: { children: ReactNode }) => {
  const {
    tenderState,
    invitedTenders,
    addInvite,
    addInvites,
    removeInvite,
    updateTender,
    deleteTender,
  } = useTenders(); // Hook that manages tender data

  const value = useMemo(
    () => ({
      tenderState,
      invitedTenders,
      addInvite,
      addInvites,
      removeInvite,
      updateTender,
      deleteTender,
    }),
    [tenderState, invitedTenders, addInvite, addInvites, removeInvite, updateTender, deleteTender]
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
