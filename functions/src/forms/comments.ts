import * as admin from 'firebase-admin';

// Comments live inline on the response document instead of in a subcollection: threads are short
// (a handful of board replies), and keeping them on the parent means listing responses stays a
// single collection read instead of one extra read per response.
export type StoredComment = {
  id: string;
  body: string;
  authorUid: string;
  createdAt: admin.firestore.Timestamp;
};

export type CommentResponse = {
  id: string;
  body: string;
  authorUid?: string;
  createdAtMs?: number;
};

export const commentMaxLength = 1500;

export const mapComments = (value: unknown): CommentResponse[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((comment): comment is StoredComment => Boolean(comment) && typeof comment === 'object')
    .map((comment) => ({
      id: typeof comment.id === 'string' ? comment.id : '',
      body: typeof comment.body === 'string' ? comment.body : '',
      authorUid: typeof comment.authorUid === 'string' ? comment.authorUid : undefined,
      createdAtMs: comment.createdAt?.toMillis?.(),
    }))
    .filter((comment) => comment.id && comment.body)
    .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
};

export const validateCommentBody = (value: unknown): { body?: string; error?: string } => {
  const body = typeof value === 'string' ? value.trim() : '';

  if (!body) {
    return { error: 'comment must not be empty' };
  }

  if (body.length > commentMaxLength) {
    return { error: `comment must be ${commentMaxLength} characters or less` };
  }

  return { body };
};

export const buildComment = (body: string, authorUid: string): StoredComment => ({
  // serverTimestamp() is not allowed inside an array element, so the write timestamp is taken here.
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  body,
  authorUid,
  createdAt: admin.firestore.Timestamp.now(),
});

export const appendComment = async (
  docRef: admin.firestore.DocumentReference,
  body: string,
  authorUid: string
): Promise<StoredComment> => {
  const comment = buildComment(body, authorUid);

  await docRef.update({
    comments: admin.firestore.FieldValue.arrayUnion(comment),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return comment;
};

/**
 * Removes one comment. Only the author may delete their own comment, so a board member cannot
 * quietly erase somebody else's reply. Returns false when the comment is missing or not theirs.
 */
export const removeComment = async (
  docRef: admin.firestore.DocumentReference,
  commentId: string,
  requesterUid: string
): Promise<boolean> => {
  return docRef.firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) {
      return false;
    }

    const comments = Array.isArray(snapshot.data()?.comments)
      ? (snapshot.data()?.comments as StoredComment[])
      : [];
    const target = comments.find((comment) => comment?.id === commentId);

    if (!target || target.authorUid !== requesterUid) {
      return false;
    }

    transaction.update(docRef, {
      comments: comments.filter((comment) => comment?.id !== commentId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  });
};
