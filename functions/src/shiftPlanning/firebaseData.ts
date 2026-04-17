import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { engagementType, Role, Shift, ShiftPlanningSurveyType, Tender } from '../types/types-file';
import {
  PlanningPeriodDoc,
  ShiftPlanningResponseDoc,
  chunkArray,
  hasRole,
  isExpectedSurveyUser,
  isPlanningEligible,
  toDate,
} from './helpers';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type TenderWithUid = Tender & { uid: string };

export type PlanningPeriodContext = {
  envRef: FirebaseFirestore.DocumentReference;
  periodRef: FirebaseFirestore.DocumentReference;
  period: PlanningPeriodDoc;
  eventIds: string[];
  submissionClosesAt: Date;
};

export type ShiftAssignmentRecord = {
  userId: string;
  shiftId: string;
  eventId: string;
  type: engagementType;
};

const isAssignmentType = (value: unknown): value is engagementType => {
  return value === engagementType.ANCHOR || value === engagementType.TENDER;
};

export type PersistPlannerResultParams = {
  envRef: FirebaseFirestore.DocumentReference;
  periodRef: FirebaseFirestore.DocumentReference;
  periodId: string;
  generatedBy: string;
  eventIds: string[];
  shifts: Shift[];
  assignments: ShiftAssignmentRecord[];
  newAnchorUserIds: string[];
  expectedSubmissions: number;
  submittedCount: number;
  assignedAnchorCount: number;
  assignedTenderCount: number;
  unfilledAnchorSlots: number;
  unfilledTenderSlots: number;
};

const getDocumentsByIds = async <T>(
  collectionRef: FirebaseFirestore.CollectionReference,
  ids: string[]
): Promise<Array<T & { id: string }>> => {
  if (ids.length === 0) {
    return [];
  }

  const chunks = chunkArray(ids, 30);
  const docs: Array<T & { id: string }> = [];

  for (const chunk of chunks) {
    const snapshot = await collectionRef
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();

    for (const doc of snapshot.docs) {
      docs.push({ ...(doc.data() as T), id: doc.id });
    }
  }

  return docs;
};

export const assertCallerCanGenerate = async (uid: string): Promise<void> => {
  const callerSnapshot = await db.collection('users').doc(uid).get();
  if (!callerSnapshot.exists || !hasRole(callerSnapshot.data() as Tender, Role.SHIFT_MANAGER)) {
    throw new HttpsError('permission-denied', 'Missing permission to run this function.');
  }
};

export const loadPlanningPeriodContext = async (
  env: string,
  periodId: string
): Promise<PlanningPeriodContext> => {
  const envRef = db.collection('env').doc(env);
  const periodRef = envRef.collection('shiftPlanningPeriods').doc(periodId);
  const periodSnapshot = await periodRef.get();

  if (!periodSnapshot.exists) {
    throw new HttpsError('not-found', `Shift planning period ${periodId} was not found.`);
  }

  const period = periodSnapshot.data() as PlanningPeriodDoc;
  const eventIds = (period.eventIds ?? []).filter((id) => typeof id === 'string' && id.length > 0);
  if (eventIds.length === 0) {
    throw new HttpsError('failed-precondition', 'Planning period does not contain any events.');
  }

  const submissionOpensAt = toDate(period.submissionOpensAt);
  const submissionClosesAt = toDate(period.submissionClosesAt);
  if (!submissionOpensAt || !submissionClosesAt) {
    throw new HttpsError('failed-precondition', 'Planning period submission window is invalid.');
  }

  return {
    envRef,
    periodRef,
    period,
    eventIds,
    submissionClosesAt,
  };
};

export const loadEligibleUsers = async (options?: {
  surveyType?: ShiftPlanningSurveyType;
}): Promise<{
  users: TenderWithUid[];
  requiredSurveyUsers: TenderWithUid[];
}> => {
  const surveyType = options?.surveyType ?? 'regularSemesterSurvey';

  const usersSnapshot = await db.collection('users').get();
  const allEligibleUsers = usersSnapshot.docs
    .map((doc) => ({ ...(doc.data() as Tender), uid: doc.id }))
    .filter(isPlanningEligible);

  const users =
    surveyType === 'newbieShiftPlanning'
      ? allEligibleUsers.filter((user) => (user.roles ?? []).includes(Role.NEWBIE))
      : allEligibleUsers;

  const requiredSurveyUsers =
    surveyType === 'regularSemesterSurvey'
      ? users.filter(isExpectedSurveyUser)
      : users.filter((user) => {
        const roles = user.roles ?? [];
        if (roles.includes(Role.PASSIVE) || roles.includes(Role.LEGACY)) {
          return false;
        }

        if (surveyType === 'newbieShiftPlanning') {
          return roles.includes(Role.NEWBIE);
        }

        return (
          roles.includes(Role.REGULAR_ACCESS) ||
          roles.includes(Role.TENDER) ||
          roles.includes(Role.ANCHOR)
        );
      });

  return { users, requiredSurveyUsers };
};

export const loadResponsesByUserId = async (
  envRef: FirebaseFirestore.DocumentReference,
  periodId: string
): Promise<Map<string, ShiftPlanningResponseDoc>> => {
  const responsesSnapshot = await envRef
    .collection('shiftPlanningResponses')
    .where('periodId', '==', periodId)
    .get();

  const responseByUserId = new Map<string, ShiftPlanningResponseDoc>();
  for (const doc of responsesSnapshot.docs) {
    const response = doc.data() as ShiftPlanningResponseDoc;
    if (!response.userId) {
      continue;
    }
    responseByUserId.set(response.userId, response);
  }

  return responseByUserId;
};

export const loadShiftsForEvents = async (
  envRef: FirebaseFirestore.DocumentReference,
  eventIds: string[]
): Promise<Shift[]> => {
  const shiftsSnapshot = await Promise.all(
    chunkArray(eventIds, 30).map((chunk) => envRef.collection('shifts').where('eventId', 'in', chunk).get())
  );

  const shifts: Shift[] = [];
  for (const snapshot of shiftsSnapshot) {
    for (const doc of snapshot.docs) {
      const data = doc.data() as Shift;
      const start = toDate(data.start);
      const end = toDate(data.end);
      if (!start || !end) {
        continue;
      }

      shifts.push({
        ...(data as Shift),
        id: doc.id,
        eventId: data.eventId,
        title: data.title,
        start,
        end,
        tenders: Number.isFinite(data.tenders) ? data.tenders : 0,
      });
    }
  }

  if (shifts.length === 0) {
    throw new HttpsError('failed-precondition', 'No shifts were found for the selected period events.');
  }

  return shifts;
};

export const loadExistingAssignmentsForShifts = async (
  envRef: FirebaseFirestore.DocumentReference,
  shifts: Shift[]
): Promise<ShiftAssignmentRecord[]> => {
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const shiftIds = shifts.map((shift) => shift.id);

  const records: ShiftAssignmentRecord[] = [];
  for (const chunk of chunkArray(shiftIds, 30)) {
    const snapshot = await envRef.collection('engagements').where('shiftId', 'in', chunk).get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as {
        shiftId?: string;
        userId?: string;
        type?: unknown;
      };

      if (!data.shiftId || !data.userId || !isAssignmentType(data.type)) {
        continue;
      }

      const shift = shiftById.get(data.shiftId);
      if (!shift) {
        continue;
      }

      records.push({
        userId: data.userId,
        shiftId: data.shiftId,
        eventId: shift.eventId,
        type: data.type,
      });
    }
  }

  return records;
};

export const persistPlannerResult = async (
  params: PersistPlannerResultParams
): Promise<{ replacedEngagementCount: number; createdEngagementCount: number }> => {
  const {
    envRef,
    periodRef,
    periodId,
    generatedBy,
    eventIds,
    shifts,
    assignments,
    newAnchorUserIds,
    expectedSubmissions,
    submittedCount,
    assignedAnchorCount,
    assignedTenderCount,
    unfilledAnchorSlots,
    unfilledTenderSlots,
  } = params;

  const shiftById = new Map<string, Shift>(shifts.map((shift) => [shift.id, shift]));
  const targetShiftIds = shifts.map((shift) => shift.id);

  const existingEngagementDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const chunk of chunkArray(targetShiftIds, 30)) {
    const existingSnapshot = await envRef.collection('engagements').where('shiftId', 'in', chunk).get();
    existingEngagementDocs.push(...existingSnapshot.docs);
  }

  const writer = db.bulkWriter();

  const existingAssignmentKeys = new Set(
    existingEngagementDocs
      .map((doc) => doc.data() as { userId?: string; shiftId?: string; type?: unknown })
      .filter((entry) => entry.userId && entry.shiftId && isAssignmentType(entry.type))
      .map((entry) => `${entry.userId}::${entry.shiftId}::${entry.type as string}`)
  );

  let createdEngagementCount = 0;

  for (const assignment of assignments) {
    const dedupeKey = `${assignment.userId}::${assignment.shiftId}::${assignment.type}`;
    if (existingAssignmentKeys.has(dedupeKey)) {
      continue;
    }

    const shift = shiftById.get(assignment.shiftId);
    if (!shift) {
      continue;
    }

    const engagementRef = envRef.collection('engagements').doc();
    writer.set(engagementRef, {
      shiftId: assignment.shiftId,
      shiftEnd: admin.firestore.Timestamp.fromDate(shift.end),
      userId: assignment.userId,
      type: assignment.type,
      upForGrabs: false,
      generatedByPlanner: true,
      planningPeriodId: periodId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    createdEngagementCount += 1;
  }

  for (const userId of newAnchorUserIds) {
    const userRef = db.collection('users').doc(userId);
    writer.set(
      userRef,
      {
        roles: admin.firestore.FieldValue.arrayUnion(Role.ANCHOR),
      },
      { merge: true }
    );
  }

  const eventDocs = await getDocumentsByIds<Record<string, unknown>>(envRef.collection('events'), eventIds);
  for (const eventDoc of eventDocs) {
    const eventRef = envRef.collection('events').doc(eventDoc.id);
    writer.set(
      eventRef,
      {
        shiftsPublished: false,
      },
      { merge: true }
    );
  }

  writer.set(
    periodRef,
    {
      status: 'generated',
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy,
      stats: {
        expectedSubmissions,
        submittedCount,
        assignedAnchorCount,
        assignedTenderCount,
        unfilledAnchorSlots,
        unfilledTenderSlots,
      },
    },
    { merge: true }
  );

  await writer.close();

  return {
    replacedEngagementCount: 0,
    createdEngagementCount,
  };
};
