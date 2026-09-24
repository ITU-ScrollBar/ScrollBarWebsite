import {
  LendingDecision,
  LendingEquipment,
  LendingRequest,
  LendingRequestCreateParams,
  LendingRequestStatus,
} from "../../types/types-file";
import { callCalendarFunction } from "./common";
import {
  CommentHttpResponse,
  addFormComment,
  deleteFormComment,
  mapComments,
} from "./formComments";

const basePath = "/lending";

type LendingRequestHttpResponse = {
  requests: {
    id: string;
    equipment: LendingEquipment;
    equipmentDetails?: string;
    occasion: string;
    pickupAtMs?: number;
    returnAtMs?: number;
    responsibilityAccepted: boolean;
    additionalInfo?: string;
    status: LendingRequestStatus;
    approvedByUids?: string[];
    declinedByUid?: string;
    createdByUid?: string;
    createdAtMs?: number;
    updatedAtMs?: number;
    comments?: CommentHttpResponse[];
  }[];
};

export const createLendingRequest = async (
  request: LendingRequestCreateParams
): Promise<{ id: string }> => {
  return callCalendarFunction<{ id: string }>(basePath, {
    method: "POST",
    body: {
      equipment: request.equipment,
      equipmentDetails: request.equipmentDetails,
      occasion: request.occasion,
      pickupAt: request.pickupAt.toISOString(),
      returnAt: request.returnAt.toISOString(),
      responsibilityAccepted: request.responsibilityAccepted,
      additionalInfo: request.additionalInfo,
    },
    unauthenticatedMessage: "You must be signed in to request equipment.",
    failureMessage: "Failed to submit lending request",
  });
};

export const listLendingRequests = async (): Promise<(LendingRequest & { key: string })[]> => {
  const payload = await callCalendarFunction<LendingRequestHttpResponse>(basePath, {
    method: "GET",
    unauthenticatedMessage: "You must be signed in to list lending requests.",
    failureMessage: "Failed to load lending requests",
  });

  return payload.requests.map((request) => ({
    id: request.id,
    key: request.id,
    equipment: request.equipment,
    equipmentDetails: request.equipmentDetails,
    occasion: request.occasion,
    pickupAt: request.pickupAtMs ? new Date(request.pickupAtMs) : undefined,
    returnAt: request.returnAtMs ? new Date(request.returnAtMs) : undefined,
    responsibilityAccepted: request.responsibilityAccepted,
    additionalInfo: request.additionalInfo,
    status: request.status,
    approvedByUids: request.approvedByUids ?? [],
    declinedByUid: request.declinedByUid,
    createdByUid: request.createdByUid,
    createdAt: request.createdAtMs ? new Date(request.createdAtMs) : undefined,
    updatedAt: request.updatedAtMs ? new Date(request.updatedAtMs) : undefined,
    comments: mapComments(request.comments),
  }));
};

export const setLendingDecision = async (
  id: string,
  decision: LendingDecision
): Promise<void> => {
  await callCalendarFunction(`${basePath}/${id}/decision`, {
    method: "POST",
    body: { decision },
    unauthenticatedMessage: "You must be signed in to review lending requests.",
    failureMessage: "Failed to update lending request",
  });
};

export const deleteLendingRequest = async (id: string): Promise<void> => {
  await callCalendarFunction(`${basePath}/${id}`, {
    method: "DELETE",
    unauthenticatedMessage: "You must be signed in to delete lending requests.",
    failureMessage: "Failed to delete lending request",
  });
};

export const addLendingComment = (id: string, body: string) =>
  addFormComment(basePath, id, body);

export const deleteLendingComment = (id: string, commentId: string) =>
  deleteFormComment(basePath, id, commentId);
