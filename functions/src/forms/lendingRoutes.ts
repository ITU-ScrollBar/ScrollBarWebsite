import express from 'express';
import * as admin from 'firebase-admin';
import { authenticateBoardMemberRequest, authenticateRequest, resolveEnv } from '../httpAuth';
import {
  LENDING_REQUIRED_APPROVALS,
  LendingDecision,
  LendingEquipment,
  LendingRequestStatus,
} from '../types/types-file';
import { appendComment, mapComments, removeComment, validateCommentBody } from './comments';

const db = admin.firestore();

const occasionMaxLength = 500;
const equipmentDetailsMaxLength = 120;
const additionalInfoMaxLength = 1000;

type LendingRequestPayload = {
  equipment?: LendingEquipment;
  equipmentDetails?: string;
  occasion?: string;
  pickupAt?: string;
  returnAt?: string;
  responsibilityAccepted?: boolean;
  additionalInfo?: string;
};

type StoredLendingRequest = {
  equipment?: LendingEquipment;
  equipmentDetails?: string;
  occasion?: string;
  pickupAt?: admin.firestore.Timestamp;
  returnAt?: admin.firestore.Timestamp;
  responsibilityAccepted?: boolean;
  additionalInfo?: string;
  status?: LendingRequestStatus;
  approvedByUids?: string[];
  declinedByUid?: string | null;
  comments?: unknown;
  createdByRef?: admin.firestore.DocumentReference;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
};

const lendingCollection = () =>
  db.collection('env').doc(resolveEnv()).collection('lendingRequests');

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// The status is always derived from the approvals, so a withdrawn approval drops an already
// approved request back to pending instead of leaving a stale "approved" badge behind.
export const deriveLendingStatus = (
  approvedByUids: string[],
  declinedByUid?: string | null
): LendingRequestStatus => {
  if (declinedByUid) {
    return 'declined';
  }

  return approvedByUids.length >= LENDING_REQUIRED_APPROVALS ? 'approved' : 'pending';
};

const mapLendingRequest = (requestDoc: admin.firestore.QueryDocumentSnapshot) => {
  const data = requestDoc.data() as StoredLendingRequest;
  const approvedByUids = Array.isArray(data.approvedByUids)
    ? data.approvedByUids.filter((uid): uid is string => typeof uid === 'string')
    : [];

  return {
    id: requestDoc.id,
    equipment: data.equipment ?? LendingEquipment.OTHER,
    equipmentDetails: data.equipmentDetails ?? '',
    occasion: data.occasion ?? '',
    pickupAtMs: data.pickupAt?.toMillis(),
    returnAtMs: data.returnAt?.toMillis(),
    responsibilityAccepted: data.responsibilityAccepted === true,
    additionalInfo: data.additionalInfo ?? '',
    status: data.status ?? deriveLendingStatus(approvedByUids, data.declinedByUid),
    approvedByUids,
    declinedByUid: data.declinedByUid ?? undefined,
    createdByUid: data.createdByRef?.id,
    createdAtMs: data.createdAt?.toMillis(),
    updatedAtMs: data.updatedAt?.toMillis(),
    comments: mapComments(data.comments),
  };
};

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const uid = await authenticateRequest(req, res);
    if (!uid) {
      return;
    }

    const {
      equipment,
      equipmentDetails,
      occasion,
      pickupAt,
      returnAt,
      responsibilityAccepted,
      additionalInfo,
    } = (req.body ?? {}) as LendingRequestPayload;

    if (!Object.values(LendingEquipment).includes(equipment as LendingEquipment)) {
      return res.status(400).send('equipment must be a valid value');
    }

    const trimmedDetails = equipmentDetails?.trim() ?? '';
    if (equipment === LendingEquipment.OTHER && !trimmedDetails) {
      return res.status(400).send('equipmentDetails is required when equipment is other');
    }

    if (trimmedDetails.length > equipmentDetailsMaxLength) {
      return res
        .status(400)
        .send(`equipmentDetails must be ${equipmentDetailsMaxLength} characters or less`);
    }

    const trimmedOccasion = occasion?.trim() ?? '';
    if (!trimmedOccasion || trimmedOccasion.length > occasionMaxLength) {
      return res.status(400).send(`occasion must be between 1 and ${occasionMaxLength} characters`);
    }

    const pickupDate = parseDate(pickupAt);
    const returnDate = parseDate(returnAt);

    if (!pickupDate) {
      return res.status(400).send('pickupAt must be a valid date');
    }

    if (!returnDate) {
      return res.status(400).send('returnAt must be a valid date');
    }

    if (returnDate.getTime() < pickupDate.getTime()) {
      return res.status(400).send('returnAt must be on or after pickupAt');
    }

    // The Microsoft form asked members to tick "Yes" here; a request without that acknowledgement
    // would be rejected by the board anyway, so it never becomes a response.
    if (responsibilityAccepted !== true) {
      return res.status(400).send('responsibilityAccepted must be accepted');
    }

    const trimmedAdditionalInfo = additionalInfo?.trim() ?? '';
    if (trimmedAdditionalInfo.length > additionalInfoMaxLength) {
      return res
        .status(400)
        .send(`additionalInfo must be ${additionalInfoMaxLength} characters or less`);
    }

    const requestRef = await lendingCollection().add({
      equipment,
      equipmentDetails: trimmedDetails,
      occasion: trimmedOccasion,
      pickupAt: admin.firestore.Timestamp.fromDate(pickupDate),
      returnAt: admin.firestore.Timestamp.fromDate(returnDate),
      responsibilityAccepted: true,
      additionalInfo: trimmedAdditionalInfo,
      status: 'pending',
      approvedByUids: [],
      declinedByUid: null,
      comments: [],
      createdByRef: db.collection('users').doc(uid),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ id: requestRef.id });
  } catch (error) {
    console.error('Lending request creation error', error);
    return res.status(500).send('Unable to create lending request');
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const snapshot = await lendingCollection().get();
    const requests = snapshot.docs
      .map(mapLendingRequest)
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Lending request list error', error);
    return res.status(500).send('Unable to list lending requests');
  }
});

router.post('/:id/decision', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const decision = ((req.body ?? {}) as { decision?: LendingDecision }).decision;

    if (!['approve', 'withdraw', 'decline', 'reopen'].includes(decision ?? '')) {
      return res.status(400).send('decision must be a valid value');
    }

    const requestRef = lendingCollection().doc(req.params.id);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(requestRef);
      if (!snapshot.exists) {
        return { outcome: 'missing' as const };
      }

      const data = snapshot.data() as StoredLendingRequest;
      const approvals = new Set(
        Array.isArray(data.approvedByUids)
          ? data.approvedByUids.filter((value): value is string => typeof value === 'string')
          : []
      );
      let declinedByUid = data.declinedByUid ?? null;

      // A decline is a real stop: it cannot be overridden by simply approving, and the request has
      // to be reopened first, which starts the two approvals over from zero.
      if (decision === 'approve' && declinedByUid) {
        return { outcome: 'declined' as const };
      }

      switch (decision) {
        case 'approve':
          approvals.add(uid);
          break;
        case 'withdraw':
          approvals.delete(uid);
          break;
        case 'decline':
          approvals.clear();
          declinedByUid = uid;
          break;
        case 'reopen':
          declinedByUid = null;
          break;
      }

      const approvedByUids = Array.from(approvals);
      const status = deriveLendingStatus(approvedByUids, declinedByUid);

      transaction.update(requestRef, {
        approvedByUids,
        declinedByUid,
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { outcome: 'ok' as const, approvedByUids, declinedByUid, status };
    });

    if (result.outcome === 'missing') {
      return res.status(404).send('Lending request not found');
    }

    if (result.outcome === 'declined') {
      return res.status(409).send('Reopen the request before approving it.');
    }

    const updated = {
      approvedByUids: result.approvedByUids,
      declinedByUid: result.declinedByUid,
      status: result.status,
    };

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Lending request decision error', error);
    return res.status(500).send('Unable to update lending request');
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

    const requestRef = lendingCollection().doc(req.params.id);
    if (!(await requestRef.get()).exists) {
      return res.status(404).send('Lending request not found');
    }

    const comment = await appendComment(requestRef, body, uid);

    return res.status(201).json({
      id: comment.id,
      body: comment.body,
      authorUid: comment.authorUid,
      createdAtMs: comment.createdAt.toMillis(),
    });
  } catch (error) {
    console.error('Lending request comment error', error);
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
      lendingCollection().doc(req.params.id),
      req.params.commentId,
      uid
    );

    if (!removed) {
      return res.status(404).send('Comment not found, or not yours to delete');
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Lending request comment delete error', error);
    return res.status(500).send('Unable to delete comment');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const requestRef = lendingCollection().doc(req.params.id);
    if (!(await requestRef.get()).exists) {
      return res.status(404).send('Lending request not found');
    }

    await requestRef.delete();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Lending request delete error', error);
    return res.status(500).send('Unable to delete lending request');
  }
});

export default router;
