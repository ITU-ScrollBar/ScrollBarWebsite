// Test-data helper for the shift-plan feature. Runs entirely client-side via the Firestore
// client SDK (same as a normal survey submission) — no Cloud Function involved. Firestore
// security rules are the actual enforcement boundary; this is only reachable by someone
// already signed in with admin access to the page it's rendered on.
import { collection, doc, DocumentReference, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "..";
import { resolveSurveyType } from "./shiftPlanning";
import { ShiftPlanningPeriod, Shift, Tender } from "../../types/types-file";

const env = import.meta.env.VITE_APP_ENV as string;

// Hides the button outside of dev — a convenience so it can't accidentally be clicked on a
// production build, not a security boundary (Firestore rules are).
export const isShiftSurveySeedingEnabled = env !== "prod";

const WRITE_BATCH_LIMIT = 450; // stay comfortably under Firestore's 500 ops/batch cap

const getResponsesCollection = () =>
  collection(doc(collection(db, "env"), env), "shiftPlanningResponses");

type SeedableUser = Pick<Tender, "uid" | "roles">;

// mulberry32 — lets callers pass a seed for reproducible test fixtures; falls back to Math.random.
const makeRng = (seed?: number): (() => number) => {
  if (seed === undefined || seed === null || Number.isNaN(seed)) {
    return Math.random;
  }
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWith = <T>(rng: () => number, input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Satellite shifts (linkedShiftId set) share the primary shift's availability answer —
// mirrors the lookup functions/src/shiftPlanning/generateShiftPlan.ts does when reading a response.
const buildAvailabilityKeys = (shifts: Shift[]): string[] => {
  const keys = new Set<string>();
  for (const shift of shifts) {
    keys.add(shift.linkedShiftId || shift.id);
  }
  return Array.from(keys);
};

const buildRandomResponse = (params: {
  user: SeedableUser;
  periodId: string;
  availabilityKeys: string[];
  anchorSeminarDays: string[];
  rng: () => number;
}): Record<string, unknown> => {
  const { user, periodId, availabilityKeys, anchorSeminarDays, rng } = params;
  const hasAnchorRole = (user.roles ?? []).includes("anchor");

  const participationRoll = rng();
  const participationStatus =
    participationRoll < 0.85
      ? "active"
      : participationRoll < 0.93
        ? "passive"
        : participationRoll < 0.97
          ? "legacy"
          : "leave";

  const isActive = participationStatus === "active";
  // Experienced anchors mostly keep anchoring; a slice of everyone else opts in too, so the
  // "new anchor" assignment path in generateShiftPlan.ts gets exercised.
  const wantsAnchor = isActive && (hasAnchorRole ? rng() < 0.8 : rng() < 0.15);
  const isNewAnchor = wantsAnchor && !hasAnchorRole;
  const anchorOnly = wantsAnchor && rng() < 0.2;

  const availability: Record<string, boolean> = {};
  if (isActive) {
    for (const key of availabilityKeys) {
      // ~55% per-shift availability keeps most shifts fillable without everyone being
      // available for everything.
      availability[key] = rng() < 0.55;
    }
  }

  const response: Record<string, unknown> = {
    periodId,
    userId: user.uid,
    participationStatus,
    wantsAnchor,
    isNewAnchor,
    availability,
    anchorOnly,
    seededTestData: true,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (isNewAnchor && anchorSeminarDays.length > 0) {
    const pickCount = 1 + Math.floor(rng() * Math.min(2, anchorSeminarDays.length));
    response.anchorSeminarDays = shuffleWith(rng, anchorSeminarDays).slice(0, pickCount);
  }

  if (participationStatus === "passive") {
    response.passiveReason = "Seeded test data for shift-plan QA";
  }

  return response;
};

const isEligibleSurveyUser = (user: Tender, requireNewbie: boolean): boolean =>
  user.active === true &&
  (user.roles ?? []).includes("tender") &&
  (!requireNewbie || (user.roles ?? []).includes("newbie"));

// Only ever creates/updates response docs, never deletes — every field is rewritten with
// {merge: true} on each run, and admins are only granted create/update on this collection,
// not delete (writing on behalf of another user was never a use case before this feature).
const commitWritesInChunks = async (writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }>) => {
  for (let i = 0; i < writes.length; i += WRITE_BATCH_LIMIT) {
    const chunk = writes.slice(i, i + WRITE_BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const entry of chunk) {
      batch.set(entry.ref, entry.data, { merge: true });
    }
    await batch.commit();
  }
};

export type SeedShiftSurveyResponsesResult = {
  seededCount: number;
};

export const seedShiftSurveyResponses = async (params: {
  period: ShiftPlanningPeriod;
  shifts: Shift[];
  tenders: Tender[];
  seed?: number;
}): Promise<SeedShiftSurveyResponsesResult> => {
  const { period, shifts, tenders, seed } = params;

  if (shifts.length === 0) {
    throw new Error("No shifts found for this period's events.");
  }

  const requireNewbie = resolveSurveyType(period) === "newbieShiftPlanning";
  const eligibleUsers = tenders.filter((user) => isEligibleSurveyUser(user, requireNewbie));

  if (eligibleUsers.length === 0) {
    throw new Error("No eligible tenders found to generate responses for.");
  }

  const responsesCollection = getResponsesCollection();
  const availabilityKeys = buildAvailabilityKeys(shifts);
  const anchorSeminarDays = period.anchorSeminarDays ?? [];
  const rng = makeRng(seed);

  const writes = eligibleUsers.map((user) => ({
    ref: doc(responsesCollection, `${period.id}_${user.uid}`),
    data: buildRandomResponse({ user, periodId: period.id, availabilityKeys, anchorSeminarDays, rng }),
  }));

  await commitWritesInChunks(writes);

  return { seededCount: eligibleUsers.length };
};
