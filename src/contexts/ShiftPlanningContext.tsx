// context/ShiftPlanningContext.tsx

import { createContext, useContext, useMemo, useState, ReactNode, Dispatch, SetStateAction } from "react";
import useShiftPlanning from "../hooks/useShiftPlanning";
import { CreateShiftPlanningPeriodPayload, GenerateShiftPlanResult } from "../firebase/api/shiftPlanning";
import { ShiftPlanningPeriod, ShiftPlanningResponse, ShiftPlanningSurveyType } from "../types/types-file";

type ShiftPlanningState = {
  loading: boolean;
  isLoaded: boolean;
  periods: ShiftPlanningPeriod[];
};

type ShiftPlanningResponseState = {
  loading: boolean;
  isLoaded: boolean;
  responses: ShiftPlanningResponse[];
};

interface ShiftPlanningContextType {
  periodState: ShiftPlanningState;
  responseState: ShiftPlanningResponseState;
  activeOpenPeriod: ShiftPlanningPeriod | null;
  selectedPeriodId: string | undefined;
  setSelectedPeriodId: Dispatch<SetStateAction<string | undefined>>;
  createPeriod: (payload: CreateShiftPlanningPeriodPayload) => Promise<string>;
  updatePeriod: (
    id: string,
    updates: Partial<{
      name: string;
      eventIds: string[];
      mandatoryEventIds: string[];
      surveyType: ShiftPlanningSurveyType;
      submissionOpensAt: Date;
      submissionClosesAt: Date;
      status: "draft" | "open" | "closed" | "generated";
      anchorSeminarDays: string[];
    }>
  ) => Promise<void>;
  submitResponse: (payload: {
    periodId: string;
    userId: string;
    participationStatus: "active" | "passive" | "legacy" | "leave";
    wantsAnchor: boolean;
    isNewAnchor?: boolean;
    availability: Record<string, boolean>;
    anchorOnly: boolean;
    anchorSeminarDays?: string[];
    comments?: string;
    passiveReason?: string;
    privateEmail?: string;
  }) => Promise<void>;
  loadUserResponse: (targetPeriodId: string, userId: string) => Promise<ShiftPlanningResponse | null>;
  triggerGeneratePlan: (targetPeriodId: string) => Promise<GenerateShiftPlanResult>;
}

const ShiftPlanningContext = createContext<ShiftPlanningContextType | undefined>(undefined);

export const ShiftPlanningProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(undefined);

  const {
    periodState,
    responseState,
    activeOpenPeriod,
    createPeriod,
    updatePeriod,
    submitResponse,
    loadUserResponse,
    triggerGeneratePlan,
  } = useShiftPlanning(selectedPeriodId);

  const value = useMemo(
    () => ({
      periodState,
      responseState,
      activeOpenPeriod,
      selectedPeriodId,
      setSelectedPeriodId,
      createPeriod,
      updatePeriod,
      submitResponse,
      loadUserResponse,
      triggerGeneratePlan,
    }),
    [
      periodState,
      responseState,
      activeOpenPeriod,
      selectedPeriodId,
      createPeriod,
      updatePeriod,
      submitResponse,
      loadUserResponse,
      triggerGeneratePlan,
    ]
  );

  return (
    <ShiftPlanningContext.Provider value={value}>{children}</ShiftPlanningContext.Provider>
  );
};

export const useShiftPlanningContext = () => {
  const context = useContext(ShiftPlanningContext);
  if (!context) {
    throw new Error("useShiftPlanningContext must be used within a ShiftPlanningProvider");
  }
  return context;
};
