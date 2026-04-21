import { ShiftPlanningResponse } from "../../../types/types-file";
import { EventDecision, ParticipationStatus } from "./types";

export const getParticipationTagColor = (status: ParticipationStatus) => {
  if (status === "active") return "green";
  if (status === "passive") return "gold";
  if (status === "legacy") return "blue";
  return "red";
};

export const getEventDecision = (
  response: ShiftPlanningResponse,
  shiftIds: string[]
): EventDecision => {
  if ((response.participationStatus ?? "active") !== "active") {
    return "unanswered";
  }

  if (shiftIds.length === 0) {
    return "unanswered";
  }

  const values = shiftIds
    .map((shiftId) => response.availability?.[shiftId])
    .filter((value) => typeof value === "boolean") as boolean[];

  if (values.length === 0) {
    return "unanswered";
  }

  const trueCount = values.filter(Boolean).length;
  if (trueCount === values.length) {
    return "can";
  }

  if (trueCount === 0) {
    return "cannot";
  }

  return "partial";
};
