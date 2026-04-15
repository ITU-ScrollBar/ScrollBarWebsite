import {
  addDoc,
  arrayRemove,
  arrayUnion,
  writeBatch,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  DocumentData,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "..";
import { ShiftPlanningPeriodStatus, ShiftPlanningSurveyType } from "../../types/types-file";

const env = import.meta.env.VITE_APP_ENV as string;

const getPeriodsCollection = () =>
  collection(doc(collection(db, "env"), env), "shiftPlanningPeriods");

const getResponsesCollection = () =>
  collection(doc(collection(db, "env"), env), "shiftPlanningResponses");

export type CreateShiftPlanningPeriodPayload = {
  name: string;
  eventIds: string[];
  mandatoryEventIds: string[];
  surveyType?: ShiftPlanningSurveyType;
  submissionOpensAt: Date;
  submissionClosesAt: Date;
  status?: ShiftPlanningPeriodStatus;
  createdBy: string;
};

export type ShiftPlanningResponsePayload = {
  periodId: string;
  userId: string;
  participationStatus: "active" | "passive" | "legacy" | "leave";
  wantsAnchor: boolean;
  availability: Record<string, boolean>;
  anchorOnly: boolean;
  comments?: string;
};

export type GenerateShiftPlanPayload = {
  periodId: string;
  replaceExistingEngagements?: boolean;
};

export type GenerateShiftPlanResult = {
  success: boolean;
  periodId: string;
  env: string;
  replacedEngagementCount: number;
  createdEngagementCount: number;
  assignedAnchorCount: number;
  assignedTenderCount: number;
  unfilledTenderSlots: number;
  unmetMandatoryCount: number;
  unmetMandatory: Array<{ eventId: string; userId: string }>;
  missingSubmissionUserIds: string[];
  afterDeadline: boolean;
  allSubmitted: boolean;
  warnings: Array<{
    code:
      | "missing_experienced_anchors_round1"
      | "new_anchor_opening_closing_not_met"
      | "underfilled_tender_shifts";
    message: string;
    details: Record<string, unknown>;
  }>;
};

export const streamShiftPlanningPeriods = (
  observer: {
    next: (snapshot: QuerySnapshot<DocumentData>) => void;
    error: (error: Error) => void;
  }
): Unsubscribe => {
  const q = query(getPeriodsCollection(), orderBy("submissionOpensAt", "desc"));
  return onSnapshot(q, observer.next, observer.error);
};

export const streamShiftPlanningResponses = (
  periodId: string,
  observer: {
    next: (snapshot: QuerySnapshot<DocumentData>) => void;
    error: (error: Error) => void;
  }
): Unsubscribe => {
  const q = query(
    getResponsesCollection(),
    where("periodId", "==", periodId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, observer.next, observer.error);
};

export const createShiftPlanningPeriod = async (
  payload: CreateShiftPlanningPeriodPayload
): Promise<DocumentData> => {
  return addDoc(getPeriodsCollection(), {
    name: payload.name,
    eventIds: payload.eventIds,
    mandatoryEventIds: payload.mandatoryEventIds,
    surveyType: payload.surveyType ?? "regularSemesterSurvey",
    submissionOpensAt: payload.submissionOpensAt,
    submissionClosesAt: payload.submissionClosesAt,
    status: payload.status ?? "open",
    createdBy: payload.createdBy,
    createdAt: serverTimestamp(),
  });
};

export const updateShiftPlanningPeriod = async (
  periodId: string,
  updates: Partial<{
    name: string;
    eventIds: string[];
    mandatoryEventIds: string[];
    surveyType: ShiftPlanningSurveyType;
    submissionOpensAt: Date;
    submissionClosesAt: Date;
    status: ShiftPlanningPeriodStatus;
  }>
): Promise<void> => {
  const ref = doc(getPeriodsCollection(), periodId);
  return updateDoc(ref, updates);
};

export const submitShiftPlanningResponse = async (
  payload: ShiftPlanningResponsePayload
): Promise<void> => {
  const responseId = `${payload.periodId}_${payload.userId}`;
  const ref = doc(getResponsesCollection(), responseId);

  await setDoc(
    ref,
    {
      periodId: payload.periodId,
      userId: payload.userId,
      participationStatus: payload.participationStatus,
      wantsAnchor: payload.wantsAnchor,
      availability: payload.availability,
      anchorOnly: payload.anchorOnly,
      comments: payload.comments?.trim() ?? "",
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getUserShiftPlanningResponse = async (
  periodId: string,
  userId: string
): Promise<DocumentData | null> => {
  const responseId = `${periodId}_${userId}`;
  const ref = doc(getResponsesCollection(), responseId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
};

export const generateShiftPlan = async (
  payload: GenerateShiftPlanPayload
): Promise<GenerateShiftPlanResult> => {
  const callable = httpsCallable<
    { env: string; periodId: string; replaceExistingEngagements: boolean },
    GenerateShiftPlanResult
  >(functions, "generateShiftPlan");

  const result = await callable({
    env,
    periodId: payload.periodId,
    replaceExistingEngagements: payload.replaceExistingEngagements ?? true,
  });

  return result.data;
};

export const updateMutualAvoidShiftPair = async (params: {
  userId: string;
  otherUserId: string;
  shouldAvoid: boolean;
}): Promise<void> => {
  const { userId, otherUserId, shouldAvoid } = params;

  if (!userId || !otherUserId || userId === otherUserId) {
    return;
  }

  const userRef = doc(collection(db, "users"), userId);
  const otherUserRef = doc(collection(db, "users"), otherUserId);

  const batch = writeBatch(db);
  batch.set(
    userRef,
    {
      avoidShiftWithUserIds: shouldAvoid
        ? arrayUnion(otherUserId)
        : arrayRemove(otherUserId),
    },
    { merge: true }
  );
  batch.set(
    otherUserRef,
    {
      avoidShiftWithUserIds: shouldAvoid
        ? arrayUnion(userId)
        : arrayRemove(userId),
    },
    { merge: true }
  );

  await batch.commit();
};
