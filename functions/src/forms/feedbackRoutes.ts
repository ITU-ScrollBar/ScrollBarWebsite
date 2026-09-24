import express from 'express';
import * as admin from 'firebase-admin';
import { authenticateBoardMemberRequest, authenticateRequest, resolveEnv } from '../httpAuth';
import { appendComment, mapComments, removeComment, validateCommentBody } from './comments';

const db = admin.firestore();

const feedbackMaxLength = 3000;

type StoredFeedback = {
  feedback?: string;
  comments?: unknown;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
};

const feedbackCollection = () =>
  db.collection('env').doc(resolveEnv()).collection('anonymousFeedback');

const mapFeedback = (feedbackDoc: admin.firestore.QueryDocumentSnapshot) => {
  const data = feedbackDoc.data() as StoredFeedback;

  return {
    id: feedbackDoc.id,
    feedback: data.feedback ?? '',
    createdAtMs: data.createdAt?.toMillis(),
    updatedAtMs: data.updatedAt?.toMillis(),
    comments: mapComments(data.comments),
  };
};

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // The token is verified so outsiders cannot spam the board, but the uid is deliberately never
    // written to the document: the submission must stay untraceable to the member who sent it.
    const uid = await authenticateRequest(req, res);
    if (!uid) {
      return;
    }

    const feedback = ((req.body ?? {}) as { feedback?: string }).feedback?.trim() ?? '';

    if (!feedback || feedback.length > feedbackMaxLength) {
      return res.status(400).send(`feedback must be between 1 and ${feedbackMaxLength} characters`);
    }

    const feedbackRef = await feedbackCollection().add({
      feedback,
      comments: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ id: feedbackRef.id });
  } catch (error) {
    console.error('Anonymous feedback creation error', error);
    return res.status(500).send('Unable to submit feedback');
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const snapshot = await feedbackCollection().get();
    const feedback = snapshot.docs
      .map(mapFeedback)
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error('Anonymous feedback list error', error);
    return res.status(500).send('Unable to list feedback');
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const { body, error } = validateCommentBody(((req.body ?? {}) as { body?: unknown }).body);
    if (!body) {
      return res.status(400).send(error);
    }

    const feedbackRef = feedbackCollection().doc(req.params.id);
    if (!(await feedbackRef.get()).exists) {
      return res.status(404).send('Feedback not found');
    }

    const comment = await appendComment(feedbackRef, body, uid);

    return res.status(201).json({
      id: comment.id,
      body: comment.body,
      authorUid: comment.authorUid,
      createdAtMs: comment.createdAt.toMillis(),
    });
  } catch (error) {
    console.error('Anonymous feedback comment error', error);
    return res.status(500).send('Unable to add comment');
  }
});

router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const removed = await removeComment(
      feedbackCollection().doc(req.params.id),
      req.params.commentId,
      uid
    );

    if (!removed) {
      return res.status(404).send('Comment not found, or not yours to delete');
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Anonymous feedback comment delete error', error);
    return res.status(500).send('Unable to delete comment');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const feedbackRef = feedbackCollection().doc(req.params.id);
    if (!(await feedbackRef.get()).exists) {
      return res.status(404).send('Feedback not found');
    }

    await feedbackRef.delete();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Anonymous feedback delete error', error);
    return res.status(500).send('Unable to delete feedback');
  }
});

export default router;
