import { message } from "antd";
import { Timestamp } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createShiftPlanningPeriod,
  CreateShiftPlanningPeriodPayload,
  generateShiftPlan,
  GenerateShiftPlanResult,
  getUserShiftPlanningResponse,
  streamShiftPlanningPeriods,
  streamShiftPlanningResponses,
  submitShiftPlanningResponse,
  updateShiftPlanningPeriod,
} from "../firebase/api/shiftPlanning";
import {
  ShiftPlanningPeriod,
  ShiftPlanningResponse,
  ShiftPlanningSurveyType,
} from "../types/types-file";

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

const toDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const casted = value as { toDate: () => Date };
    return casted.toDate();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
};

const useShiftPlanning = (periodId?: string) => {
  const [periodState, setPeriodState] = useState<ShiftPlanningState>({
    loading: false,
    isLoaded: false,
    periods: [],
  });

  const [responseState, setResponseState] = useState<ShiftPlanningResponseState>({
    loading: false,
    isLoaded: false,
    responses: [],
  });

  useEffect(() => {
    setPeriodState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamShiftPlanningPeriods({
      next: (snapshot) => {
        const periods = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            key: doc.id,
            submissionOpensAt: toDate(data.submissionOpensAt) as Date,
            submissionClosesAt: toDate(data.submissionClosesAt) as Date,
            createdAt: toDate(data.createdAt),
            generatedAt: toDate(data.generatedAt),
          } as ShiftPlanningPeriod;
        });

        setPeriodState({
          loading: false,
          isLoaded: true,
          periods,
        });
      },
      error: (error) => {
        message.error(`Failed to load shift planning periods: ${error.message}`);
        setPeriodState((prev) => ({ ...prev, loading: false }));
      },
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!periodId) {
      setResponseState({ loading: false, isLoaded: true, responses: [] });
      return;
    }

    setResponseState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamShiftPlanningResponses(periodId, {
      next: (snapshot) => {
        const responses = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            key: doc.id,
            submittedAt: toDate(data.submittedAt),
            updatedAt: toDate(data.updatedAt),
          } as ShiftPlanningResponse;
        });

        setResponseState({
          loading: false,
          isLoaded: true,
          responses,
        });
      },
      error: (error) => {
        message.error(`Failed to load shift planning responses: ${error.message}`);
        setResponseState((prev) => ({ ...prev, loading: false }));
      },
    });

    return unsubscribe;
  }, [periodId]);

  const createPeriod = useCallback(async (payload: CreateShiftPlanningPeriodPayload) => {
    const created = await createShiftPlanningPeriod(payload);
    message.success("Shift planning period created.");
    return created;
  }, []);

  const updatePeriod = useCallback(async (
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
  ) => {
    await updateShiftPlanningPeriod(id, updates);
    message.success("Shift planning period updated.");
  }, []);

  const submitResponse = useCallback(async (payload: {
    periodId: string;
    userId: string;
    participationStatus: "active" | "passive" | "legacy" | "leave";
    wantsAnchor: boolean;
    availability: Record<string, boolean>;
    anchorOnly: boolean;
    anchorSeminarDays?: string[];
    comments?: string;
    passiveReason?: string;
    privateEmail?: string;
  }) => {
    await submitShiftPlanningResponse(payload);
  }, []);

  const loadUserResponse = useCallback(async (targetPeriodId: string, userId: string) => {
    const response = await getUserShiftPlanningResponse(targetPeriodId, userId);
    if (!response) {
      return null;
    }

    return {
      ...response,
      submittedAt: toDate(response.submittedAt),
      updatedAt: toDate(response.updatedAt),
    } as ShiftPlanningResponse;
  }, []);

  const triggerGeneratePlan = useCallback(async (targetPeriodId: string): Promise<GenerateShiftPlanResult> => {
    const result = await generateShiftPlan({
      periodId: targetPeriodId,
    });

    message.success("Shift plan generated as unpublished engagements.");
    return result;
  }, []);

  const activeOpenPeriod = useMemo(() => {
    const now = Date.now();

    return (
      periodState.periods
        .filter((period) => period.status === "open")
        .filter((period) => period.submissionOpensAt?.getTime() <= now)
        .filter((period) => period.submissionClosesAt?.getTime() >= now)
        .sort(
          (a, b) =>
            (a.submissionClosesAt?.getTime() ?? 0) - (b.submissionClosesAt?.getTime() ?? 0)
        )[0] ?? null
    );
  }, [periodState.periods]);

  return {
    periodState,
    responseState,
    activeOpenPeriod,
    createPeriod,
    updatePeriod,
    submitResponse,
    loadUserResponse,
    triggerGeneratePlan,
  };
};

export default useShiftPlanning;
