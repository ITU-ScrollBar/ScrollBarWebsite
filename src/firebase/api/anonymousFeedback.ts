import { AnonymousFeedback, AnonymousFeedbackCreateParams } from "../../types/types-file";
import { callCalendarFunction } from "./common";
import {
  CommentHttpResponse,
  addFormComment,
  deleteFormComment,
  mapComments,
} from "./formComments";

const basePath = "/feedback";

type AnonymousFeedbackHttpResponse = {
  feedback: {
    id: string;
    feedback: string;
    name?: string;
    createdAtMs?: number;
    updatedAtMs?: number;
    comments?: CommentHttpResponse[];
  }[];
};

/**
 * Submits anonymous feedback. The request is authenticated so outsiders cannot spam the board,
 * but the backend deliberately stores nothing that identifies the sender beyond an optional,
 * self-typed name.
 */
export const submitAnonymousFeedback = async (
  params: AnonymousFeedbackCreateParams
): Promise<{ id: string }> => {
  return callCalendarFunction<{ id: string }>(basePath, {
    method: "POST",
    body: params,
    unauthenticatedMessage: "You must be signed in to submit feedback.",
    failureMessage: "Failed to submit feedback",
  });
};

export const listAnonymousFeedback = async (): Promise<(AnonymousFeedback & { key: string })[]> => {
  const payload = await callCalendarFunction<AnonymousFeedbackHttpResponse>(basePath, {
    method: "GET",
    unauthenticatedMessage: "You must be signed in to list feedback.",
    failureMessage: "Failed to load feedback",
  });

  return payload.feedback.map((entry) => ({
    id: entry.id,
    key: entry.id,
    feedback: entry.feedback,
    name: entry.name,
    createdAt: entry.createdAtMs ? new Date(entry.createdAtMs) : undefined,
    updatedAt: entry.updatedAtMs ? new Date(entry.updatedAtMs) : undefined,
    comments: mapComments(entry.comments),
  }));
};

export const deleteAnonymousFeedback = async (id: string): Promise<void> => {
  await callCalendarFunction(`${basePath}/${id}`, {
    method: "DELETE",
    unauthenticatedMessage: "You must be signed in to delete feedback.",
    failureMessage: "Failed to delete feedback",
  });
};

export const addFeedbackComment = (id: string, body: string) =>
  addFormComment(basePath, id, body);

export const deleteFeedbackComment = (id: string, commentId: string) =>
  deleteFormComment(basePath, id, commentId);
