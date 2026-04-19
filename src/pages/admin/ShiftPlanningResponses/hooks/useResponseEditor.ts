import { message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShiftPlanningPeriod, ShiftPlanningResponse } from "../../../../types/types-file";
import { EventChoice, ParticipationStatus, PeriodEventGroup } from "../types";

type SubmitPayload = {
  periodId: string;
  userId: string;
  participationStatus: ParticipationStatus;
  wantsAnchor: boolean;
  availability: Record<string, boolean>;
  anchorOnly: boolean;
  comments?: string;
  passiveReason?: string;
  privateEmail?: string;
};

type UseResponseEditorParams = {
  selectedPeriod: ShiftPlanningPeriod | null;
  selectedUserId: string | undefined;
  periodEventGroups: PeriodEventGroup[];
  loadUserResponse: (periodId: string, userId: string) => Promise<ShiftPlanningResponse | null>;
  submitResponse: (payload: SubmitPayload) => Promise<void>;
  userNameById: Map<string, string>;
};

export const useResponseEditor = ({
  selectedPeriod,
  selectedUserId,
  periodEventGroups,
  loadUserResponse,
  submitResponse,
  userNameById,
}: UseResponseEditorParams) => {
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus | undefined>(undefined);
  const [wantsAnchor, setWantsAnchor] = useState<boolean | undefined>(undefined);
  const [anchorOnly, setAnchorOnly] = useState(false);
  const [anchorSeminarDays, setAnchorSeminarDays] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [passiveReason, setPassiveReason] = useState("");
  const [privateEmail, setPrivateEmail] = useState("");
  const [eventChoices, setEventChoices] = useState<Partial<Record<string, EventChoice>>>({});
  const [eventCanShiftIds, setEventCanShiftIds] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExistingResponse, setHasExistingResponse] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!selectedPeriod?.id || !selectedUserId) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadUserResponse(selectedPeriod.id, selectedUserId)
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (!response) {
          setHasExistingResponse(false);
          setParticipationStatus("active");
          setWantsAnchor(false);
          setAnchorOnly(false);
          setAnchorSeminarDays([]);
          setComments("");
          setPassiveReason("");
          setPrivateEmail("");
          setEventChoices({});
          setEventCanShiftIds({});
          setSubmittedAt(null);
          return;
        }

        const loadedParticipation = (response.participationStatus as ParticipationStatus | undefined) ?? "active";
        const loadedWantsAnchor =
          typeof response.wantsAnchor === "boolean" ? response.wantsAnchor : Boolean(response.anchorOnly);

        const loadedChoices: Partial<Record<string, EventChoice>> = {};
        const loadedCanShiftIds: Record<string, string[]> = {};

        if (loadedParticipation === "active") {
          for (const group of periodEventGroups) {
            const hasAnyAnswer = group.shifts.some(
              (shift) => typeof response.availability?.[shift.id] === "boolean"
            );
            if (!hasAnyAnswer) continue;
            const allCanWork = group.shifts.every(
              (shift) => response.availability?.[shift.id] === true
            );
            if (allCanWork) {
              loadedChoices[group.eventId] = "can";
            } else {
              loadedChoices[group.eventId] = "cannot";
              loadedCanShiftIds[group.eventId] = group.shifts
                .filter((shift) => response.availability?.[shift.id] === true)
                .map((shift) => shift.id);
            }
          }
        }

        setHasExistingResponse(true);
        setParticipationStatus(loadedParticipation);
        setWantsAnchor(loadedWantsAnchor);
        setAnchorOnly(Boolean(response.anchorOnly));
        setAnchorSeminarDays(Array.isArray(response.anchorSeminarDays) ? response.anchorSeminarDays : []);
        setComments(response.comments ?? "");
        setPassiveReason(response.passiveReason ?? "");
        setPrivateEmail(response.privateEmail ?? "");
        setEventChoices(loadedChoices);
        setEventCanShiftIds(loadedCanShiftIds);
        setSubmittedAt(response.submittedAt ?? response.updatedAt ?? null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadUserResponse, periodEventGroups, selectedPeriod?.id, selectedUserId]);

  const handleEventChoice = useCallback((eventId: string, value: EventChoice) => {
    setEventChoices((prev) => ({ ...prev, [eventId]: value }));
    if (value === "can") {
      setEventCanShiftIds((prev) => ({ ...prev, [eventId]: [] }));
    }
  }, []);

  const handleCanShiftIds = useCallback((eventId: string, shiftIds: string[]) => {
    setEventCanShiftIds((prev) => ({ ...prev, [eventId]: shiftIds }));
  }, []);

  const handleParticipationStatusChange = useCallback((value: ParticipationStatus) => {
    setParticipationStatus(value);
    if (value !== "active") {
      setWantsAnchor(false);
      setAnchorOnly(false);
      setEventChoices({});
      setEventCanShiftIds({});
    }
  }, []);

  const handleWantsAnchorChange = useCallback((value: boolean) => {
    setWantsAnchor(value);
    if (!value) {
      setAnchorOnly(false);
    }
  }, []);

  const allEventsAnswered = useMemo(() => {
    if (participationStatus !== "active") {
      return true;
    }
    return periodEventGroups.every((group) => {
      const choice = eventChoices[group.eventId];
      return choice === "can" || choice === "cannot";
    });
  }, [eventChoices, participationStatus, periodEventGroups]);

  const handleSubmitOrEdit = useCallback(async () => {
    if (!selectedPeriod || !selectedUserId) {
      return;
    }

    if (!participationStatus) {
      message.error("Choose participation status before saving.");
      return;
    }

    if (participationStatus === "active" && wantsAnchor === undefined) {
      message.error("Choose anchor preference before saving.");
      return;
    }

    if (!allEventsAnswered) {
      message.error("Please choose can/cannot for every event before saving.");
      return;
    }

    const normalizedAvailability: Record<string, boolean> = {};
    if (participationStatus === "active") {
      for (const group of periodEventGroups) {
        const choice = eventChoices[group.eventId];
        if (!choice) continue;
        if (choice === "can") {
          for (const shift of group.shifts) {
            normalizedAvailability[shift.id] = true;
          }
          continue;
        }
        const selectedShiftIds = new Set(eventCanShiftIds[group.eventId] ?? []);
        for (const shift of group.shifts) {
          normalizedAvailability[shift.id] = selectedShiftIds.has(shift.id);
        }
      }
    }

    const resolvedWantsAnchor = participationStatus === "active" && wantsAnchor === true;

    setSaving(true);
    try {
      await submitResponse({
        periodId: selectedPeriod.id,
        userId: selectedUserId,
        participationStatus,
        wantsAnchor: resolvedWantsAnchor,
        availability: normalizedAvailability,
        anchorOnly: resolvedWantsAnchor ? anchorOnly : false,
        comments,
        passiveReason,
        privateEmail,
      });
      setHasExistingResponse(true);
      setSubmittedAt(new Date());
      message.success(`Saved shift availability for ${userNameById.get(selectedUserId) ?? selectedUserId}.`);
    } catch (error) {
      const casted = error as { message?: string };
      message.error(casted.message ?? "Failed to save response.");
    } finally {
      setSaving(false);
    }
  }, [
    allEventsAnswered,
    anchorOnly,
    comments,
    eventCanShiftIds,
    eventChoices,
    participationStatus,
    passiveReason,
    periodEventGroups,
    privateEmail,
    selectedPeriod,
    selectedUserId,
    submitResponse,
    userNameById,
    wantsAnchor,
  ]);

  return {
    participationStatus,
    wantsAnchor,
    anchorOnly,
    setAnchorOnly,
    anchorSeminarDays,
    comments,
    setComments,
    passiveReason,
    setPassiveReason,
    privateEmail,
    setPrivateEmail,
    eventChoices,
    eventCanShiftIds,
    loading,
    saving,
    hasExistingResponse,
    submittedAt,
    allEventsAnswered,
    handleEventChoice,
    handleCanShiftIds,
    handleParticipationStatusChange,
    handleWantsAnchorChange,
    handleSubmitOrEdit,
  };
};
