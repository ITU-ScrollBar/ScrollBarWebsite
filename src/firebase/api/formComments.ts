import { FormComment } from "../../types/types-file";
import { callCalendarFunction } from "./common";

// Comments are returned inline with their parent response, so both the lending and the feedback
// endpoints share this wire shape.
export type CommentHttpResponse = {
  id: string;
  body: string;
  authorUid?: string;
  createdAtMs?: number;
};

export const mapComments = (comments?: CommentHttpResponse[]): FormComment[] =>
  (comments ?? []).map((comment) => ({
    id: comment.id,
    body: comment.body,
    authorUid: comment.authorUid,
    createdAt: comment.createdAtMs ? new Date(comment.createdAtMs) : undefined,
  }));

export const addFormComment = async (
  basePath: string,
  id: string,
  body: string
): Promise<FormComment> => {
  const comment = await callCalendarFunction<CommentHttpResponse>(
    `${basePath}/${id}/comments`,
    {
      method: "POST",
      body: { body },
      unauthenticatedMessage: "You must be signed in to comment.",
      failureMessage: "Failed to add comment",
    }
  );

  return mapComments([comment])[0];
};

export const deleteFormComment = async (
  basePath: string,
  id: string,
  commentId: string
): Promise<void> => {
  await callCalendarFunction(`${basePath}/${id}/comments/${commentId}`, {
    method: "DELETE",
    unauthenticatedMessage: "You must be signed in to delete a comment.",
    failureMessage: "Failed to delete comment",
  });
};
