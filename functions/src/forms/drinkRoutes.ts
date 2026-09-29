import express from 'express';
import * as admin from 'firebase-admin';
import { authenticateBoardMemberRequest, resolveEnv } from '../httpAuth';
import {
  DRINK_CREATOR_NAME_MAX_LENGTH,
  DRINK_MAX_STEPS,
  DRINK_NAME_MAX_LENGTH,
  DrinkStep,
  buildDrink,
  isDrinkAmount,
  normalizeItuInitials,
} from '../types/drinkRecipe';

const db = admin.firestore();

type StoredDrinkSubmission = {
  drinkName?: string;
  creatorName?: string;
  ituInitials?: string;
  steps?: DrinkStep[];
  totalCl?: number;
  shots?: number;
  createdAt?: admin.firestore.Timestamp;
};

const drinkCollection = () =>
  db.collection('env').doc(resolveEnv()).collection('drinkSubmissions');

const parseSteps = (value: unknown): DrinkStep[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > DRINK_MAX_STEPS) {
    return null;
  }

  const steps: DrinkStep[] = [];
  for (const entry of value) {
    const { ingredientId, amount } = (entry ?? {}) as { ingredientId?: unknown; amount?: unknown };
    if (typeof ingredientId !== 'string' || !isDrinkAmount(amount)) {
      return null;
    }
    steps.push({ ingredientId, amount });
  }

  return steps;
};

const mapDrinkSubmission = (drinkDoc: admin.firestore.QueryDocumentSnapshot) => {
  const data = drinkDoc.data() as StoredDrinkSubmission;

  return {
    id: drinkDoc.id,
    drinkName: data.drinkName ?? '',
    creatorName: data.creatorName ?? '',
    ituInitials: data.ituInitials ?? '',
    steps: Array.isArray(data.steps) ? data.steps : [],
    totalCl: data.totalCl ?? 0,
    shots: data.shots ?? 0,
    createdAtMs: data.createdAt?.toMillis(),
  };
};

const router = express.Router();

// Public on purpose: the drink builder is open to everyone, signed in or not. The recipe is
// replayed against the same rules as the page so only drinks the bar can actually make get stored.
router.post('/', async (req, res) => {
  try {
    const body = (req.body ?? {}) as {
      drinkName?: unknown;
      creatorName?: unknown;
      ituInitials?: unknown;
      steps?: unknown;
    };
    const drinkName = typeof body.drinkName === 'string' ? body.drinkName.trim() : '';
    const creatorName = typeof body.creatorName === 'string' ? body.creatorName.trim() : '';
    const ituInitials =
      typeof body.ituInitials === 'string' ? normalizeItuInitials(body.ituInitials) : null;
    const steps = parseSteps(body.steps);

    if (!drinkName || drinkName.length > DRINK_NAME_MAX_LENGTH) {
      return res.status(400).send(`drinkName must be between 1 and ${DRINK_NAME_MAX_LENGTH} characters`);
    }

    if (!creatorName || creatorName.length > DRINK_CREATOR_NAME_MAX_LENGTH) {
      return res
        .status(400)
        .send(`creatorName must be between 1 and ${DRINK_CREATOR_NAME_MAX_LENGTH} characters`);
    }

    if (!ituInitials) {
      return res.status(400).send('ituInitials must be your ITU initials, e.g. "abcd"');
    }

    if (!steps) {
      return res.status(400).send(`steps must hold between 1 and ${DRINK_MAX_STEPS} valid pours`);
    }

    const { state, error } = buildDrink(steps);
    if (error) {
      return res.status(400).send(error);
    }

    const drinkRef = await drinkCollection().add({
      drinkName,
      creatorName,
      ituInitials,
      steps,
      totalCl: state.levelCl,
      shots: state.shots,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ id: drinkRef.id });
  } catch (error) {
    console.error('Drink submission creation error', error);
    return res.status(500).send('Unable to submit drink');
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const snapshot = await drinkCollection().get();
    const drinks = snapshot.docs
      .map(mapDrinkSubmission)
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));

    return res.status(200).json({ drinks });
  } catch (error) {
    console.error('Drink submission list error', error);
    return res.status(500).send('Unable to list drinks');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = await authenticateBoardMemberRequest(req, res);
    if (!uid) {
      return;
    }

    const drinkRef = drinkCollection().doc(req.params.id);
    if (!(await drinkRef.get()).exists) {
      return res.status(404).send('Drink not found');
    }

    await drinkRef.delete();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Drink submission delete error', error);
    return res.status(500).send('Unable to delete drink');
  }
});

export default router;
