import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { engagementType, Role, ShiftPlanningSurveyType } from '../types/types-file';
import {
  User,
  ShiftCategory,
  Slot,
  assignSlotsRoundRobin,
  getResponseAvailability,
  getShiftCategoryMap,
} from './helpers';
import {
  ShiftAssignmentRecord,
  assertCallerCanGenerate,
  loadExistingAssignmentsForShifts,
  loadEligibleUsers,
  loadPlanningPeriodContext,
  loadResponsesByUserId,
  loadShiftsForEvents,
  persistPlannerResult,
} from './firebaseData';

type GenerateShiftPlanRequest = {
  env?: string;
  periodId?: string;
  replaceExistingEngagements?: boolean;
};

type GenerateShiftPlanWarning = {
  code:
    | 'missing_experienced_anchors_round1'
    | 'new_anchor_opening_closing_not_met'
    | 'underfilled_tender_shifts';
  message: string;
  details: Record<string, unknown>;
};

const resolveSurveyType = (period: {
  surveyType?: ShiftPlanningSurveyType;
  includeShiftStatusQuestions?: boolean;
}): ShiftPlanningSurveyType => {
  if (period.surveyType) {
    return period.surveyType;
  }

  if (period.includeShiftStatusQuestions === false) {
    return 'excludeSemesterStatus';
  }

  return 'regularSemesterSurvey';
};

export const generateShiftPlan = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<GenerateShiftPlanRequest>) => {
    // Guard: only authenticated callers can trigger planner generation.
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'You must be authenticated to generate a shift plan.');
    }
    const warnings: GenerateShiftPlanWarning[] = [];

    const uid = request.auth.uid;
    const env = request.data?.env ?? 'dev';
    const periodId = request.data?.periodId?.trim();

    if (!periodId) {
      throw new HttpsError('invalid-argument', 'Missing required field: periodId.');
    }

    // Guard: planner generation is restricted to shift managers.
    await assertCallerCanGenerate(uid);

    // Load immutable planning context (period, event scope, submission window).
    const { envRef, periodRef, period, eventIds, submissionClosesAt } = await loadPlanningPeriodContext(
      env,
      periodId
    );
    const surveyType = resolveSurveyType(period);
    const includeShiftStatusQuestions = surveyType === 'regularSemesterSurvey';

    const now = new Date();

    const { users, requiredSurveyUsers } = await loadEligibleUsers({
      surveyType,
    });
    const responseByUserId = await loadResponsesByUserId(envRef, periodId);

    const missingSubmissionUserIds = requiredSurveyUsers
      .filter((user) => !responseByUserId.has(user.uid))
      .map((user) => user.uid);

    const allSubmitted = missingSubmissionUserIds.length === 0;
    const afterDeadline = now.getTime() >= submissionClosesAt.getTime();

    // Hard rule: either everyone submitted, or submission deadline has passed.
    if (!allSubmitted && !afterDeadline) {
      throw new HttpsError(
        'failed-precondition',
        'Not all users have submitted availability and the deadline has not passed yet.',
        {
          expectedSubmissions: requiredSurveyUsers.length,
          submittedCount: requiredSurveyUsers.length - missingSubmissionUserIds.length,
          missingSubmissionUserIds,
        }
      );
    }

    // Materialize shifts participating in this planning period.
    const shifts = await loadShiftsForEvents(envRef, eventIds);
    const existingAssignments = await loadExistingAssignmentsForShifts(envRef, shifts);

    // Shift categories are used to spread opening/closing/middle work fairly.
    const categoryByShiftId = getShiftCategoryMap(shifts);

    // Build normalized per-semester user state by combining profile + response.
    const userList: User[] = users.map((user) => {
      const response = responseByUserId.get(user.uid);
      const hasAnchorRole = user?.roles?.includes(Role.ANCHOR) === true;

      if (!includeShiftStatusQuestions) {
        if (surveyType === 'newbieShiftPlanning') {
          return {
            ...user,
            roles: user.roles ?? [],
            isAnchor: false,
            participationStatus: 'active',
            wantsAnchor: false,
            experiencedAnchor: false,
            anchorOnly: false,
          };
        }

        return {
          ...user,
          roles: user.roles ?? [],
          isAnchor: hasAnchorRole,
          participationStatus: 'active',
          wantsAnchor: hasAnchorRole,
          experiencedAnchor: hasAnchorRole,
          anchorOnly: false,
        };
      }

      const participationStatus = response?.participationStatus ?? 'active';
      const isActive = participationStatus === 'active';
      const wantsAnchor = isActive && response?.wantsAnchor === true;
      const isNewAnchor = wantsAnchor && !hasAnchorRole;

      return {
        ...user,
        roles: user.roles ?? [],
        isAnchor: wantsAnchor && (Boolean(hasAnchorRole) || isNewAnchor),
        participationStatus,
        wantsAnchor,
        experiencedAnchor: Boolean(hasAnchorRole),
        anchorOnly: wantsAnchor ? Boolean(response?.anchorOnly) : false,
      };
    });

    // New anchors are given the Role.ANCHOR after successful plan persistence.
    const newAnchorUserIds = userList
      .filter((user) => user.wantsAnchor && !user.experiencedAnchor)
      .map((user) => user.uid);

    const activeUsers = userList.filter((user) => user.participationStatus === 'active');
    const userById = new Map(userList.map((user) => [user.uid, user]));

    const avoidShiftWithByUserId = new Map<string, Set<string>>(
      activeUsers.map((user) => [user.uid, new Set(user.avoidShiftWithUserIds ?? [])])
    );
    const assignedUserIdsByShiftId = new Map<string, Set<string>>();
    const markAssignedToShift = (userId: string, shiftId: string): void => {
      const current = assignedUserIdsByShiftId.get(shiftId) ?? new Set<string>();
      current.add(userId);
      assignedUserIdsByShiftId.set(shiftId, current);
    };

    const hasAvoidConflictOnShift = (userId: string, shiftId: string): boolean => {
      const usersOnShift = assignedUserIdsByShiftId.get(shiftId);
      if (!usersOnShift || usersOnShift.size === 0) {
        return false;
      }

      const avoidSet = avoidShiftWithByUserId.get(userId) ?? new Set<string>();
      for (const existingUserId of usersOnShift) {
        if (existingUserId === userId) {
          continue;
        }

        const existingAvoidSet = avoidShiftWithByUserId.get(existingUserId) ?? new Set<string>();
        if (avoidSet.has(existingUserId) || existingAvoidSet.has(userId)) {
          return true;
        }
      }

      return false;
    };

    const hasAvoidConflict = (user: User, slot: Slot): boolean => {
      return hasAvoidConflictOnShift(user.uid, slot.shiftId);
    };

    const onSlotAssigned = (user: User, slot: Slot): void => {
      markAssignedToShift(user.uid, slot.shiftId);
    };

    // Tracks enforce fairness and one-event-per-user constraints during assignment.
    const assignedEventsByUser = new Map<string, Set<string>>();
    const assignedAnchorCountByUser = new Map<string, number>();
    const assignedTenderCountByUser = new Map<string, number>();
    const totalAssignedCountByUser = new Map<string, number>();

    for (const user of userList) {
      assignedEventsByUser.set(user.uid, new Set<string>());
      assignedAnchorCountByUser.set(user.uid, 0);
      assignedTenderCountByUser.set(user.uid, 0);
      totalAssignedCountByUser.set(user.uid, 0);
    }

    for (const assignment of existingAssignments) {
      const userEvents = assignedEventsByUser.get(assignment.userId) ?? new Set<string>();
      userEvents.add(assignment.eventId);
      assignedEventsByUser.set(assignment.userId, userEvents);

      totalAssignedCountByUser.set(
        assignment.userId,
        (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
      );

      if (assignment.type === engagementType.ANCHOR) {
        assignedAnchorCountByUser.set(
          assignment.userId,
          (assignedAnchorCountByUser.get(assignment.userId) ?? 0) + 1
        );
      }

      if (assignment.type === engagementType.TENDER) {
        assignedTenderCountByUser.set(
          assignment.userId,
          (assignedTenderCountByUser.get(assignment.userId) ?? 0) + 1
        );
      }
    }

    for (const assignment of existingAssignments) {
      markAssignedToShift(assignment.userId, assignment.shiftId);
    }

    const allAssignments: ShiftAssignmentRecord[] = [...existingAssignments];
    const plannedAssignments: ShiftAssignmentRecord[] = [];

    const assignedAnchorsByShiftId = new Map<string, number>();
    for (const assignment of existingAssignments) {
      if (assignment.type !== engagementType.ANCHOR) {
        continue;
      }

      assignedAnchorsByShiftId.set(
        assignment.shiftId,
        (assignedAnchorsByShiftId.get(assignment.shiftId) ?? 0) + 1
      );
    }

    // Build anchor capacity from shifts (at least one anchor slot per shift).
    const anchorSlots: Slot[] = [];
    for (const shift of shifts) {
      const existingAnchors = assignedAnchorsByShiftId.get(shift.id) ?? 0;
      if (existingAnchors >= 1) {
        continue;
      }

      anchorSlots.push({
        id: `${shift.id}::anchor`,
        shiftId: shift.id,
        eventId: shift.eventId,
        category: categoryByShiftId.get(shift.id) ?? 'other',
      });
    }

    const anchorUsers = activeUsers.filter((user) => user.wantsAnchor);

    // Phase 1: place experienced anchors first - 1 per shift.
    const experiencedAnchors = anchorUsers.filter((user) => user.experiencedAnchor);

    const canTakeAnchorSlot = (user: User, slot: Slot): boolean => {
      if (!user.experiencedAnchor || !user.wantsAnchor || user.participationStatus !== 'active') {
        return false;
      }
      if (assignedUserIdsByShiftId.get(slot.shiftId)?.has(user.uid) === true) {
        return false;
      }
      if (hasAvoidConflictOnShift(user.uid, slot.shiftId)) {
        return false;
      }
      return getResponseAvailability(responseByUserId, user.uid, slot.shiftId);
    };

    const anchorPhase1 = assignSlotsRoundRobin({
      slots: anchorSlots,
      users: experiencedAnchors,
      assignedEventsByUser,
      assignedCountByUser: assignedAnchorCountByUser,
      canTake: canTakeAnchorSlot,
      hasConflict: hasAvoidConflict,
      onAssigned: onSlotAssigned,
    });

    const assignedAnchorSlotIds = new Set(anchorPhase1.assignments.map((entry) => entry.slotId));

    // Persist anchor assignments
    for (const assignment of anchorPhase1.assignments) {
      const slot = anchorSlots.find((candidate) => candidate.id === assignment.slotId);
      if (!slot) {
        continue;
      }
      allAssignments.push({
        userId: assignment.userId,
        shiftId: slot.shiftId,
        eventId: slot.eventId,
        type: engagementType.ANCHOR,
      });
      plannedAssignments.push({
        userId: assignment.userId,
        shiftId: slot.shiftId,
        eventId: slot.eventId,
        type: engagementType.ANCHOR,
      });

      assignedAnchorsByShiftId.set(slot.shiftId, (assignedAnchorsByShiftId.get(slot.shiftId) ?? 0) + 1);
      totalAssignedCountByUser.set(
        assignment.userId,
        (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
      );
    }

    const unresolvedAnchorSlots = anchorSlots.filter((slot) => !assignedAnchorSlotIds.has(slot.id));
    if (unresolvedAnchorSlots.length > 0) {
      warnings.push({
        code: 'missing_experienced_anchors_round1',
        message: `${unresolvedAnchorSlots.length} shifts had no experienced anchor assigned in round 1.`,
        details: {
          shiftIds: unresolvedAnchorSlots.map((slot) => slot.shiftId),
        },
      });
    }

    // Phase 2: assign new anchors one opening and one closing shift each.
    const experiencedAnchorShiftIds = new Set<string>();
    for (const assignment of allAssignments) {
      if (assignment.type !== engagementType.ANCHOR) {
        continue;
      }

      if (userById.get(assignment.userId)?.experiencedAnchor === true) {
        experiencedAnchorShiftIds.add(assignment.shiftId);
      }
    }

    const newAnchorUsers = anchorUsers.filter((user) => !user.experiencedAnchor);

    const canTakeNewAnchorSlot = (user: User, slot: Slot): boolean => {
      if (!user.wantsAnchor || user.experiencedAnchor) {
        return false;
      }
      if ((assignedAnchorsByShiftId.get(slot.shiftId) ?? 0) >= 2) {
        return false;
      }
      if (assignedUserIdsByShiftId.get(slot.shiftId)?.has(user.uid) === true) {
        return false;
      }
      if (hasAvoidConflictOnShift(user.uid, slot.shiftId)) {
        return false;
      }

      return getResponseAvailability(responseByUserId, user.uid, slot.shiftId);
    };

    const openingAnchorSlots = anchorSlots.filter(
      (slot) =>
        slot.category === 'opening' &&
        experiencedAnchorShiftIds.has(slot.shiftId) &&
        (assignedAnchorsByShiftId.get(slot.shiftId) ?? 0) < 2
    );
    const openingAnchorCountByUser = new Map<string, number>();
    for (const user of newAnchorUsers) {
      openingAnchorCountByUser.set(user.uid, 0);
    }

    const newAnchorOpeningPhase = assignSlotsRoundRobin({
      slots: openingAnchorSlots,
      users: newAnchorUsers,
      assignedEventsByUser,
      assignedCountByUser: openingAnchorCountByUser,
      canTake: canTakeNewAnchorSlot,
      maxPerUser: 1,
      hasConflict: hasAvoidConflict,
      onAssigned: onSlotAssigned,
    });

    for (const assignment of newAnchorOpeningPhase.assignments) {
      allAssignments.push({
        userId: assignment.userId,
        shiftId: assignment.shiftId,
        eventId: assignment.eventId,
        type: engagementType.ANCHOR,
      });
      plannedAssignments.push({
        userId: assignment.userId,
        shiftId: assignment.shiftId,
        eventId: assignment.eventId,
        type: engagementType.ANCHOR,
      });
      assignedAnchorsByShiftId.set(
        assignment.shiftId,
        (assignedAnchorsByShiftId.get(assignment.shiftId) ?? 0) + 1
      );
      totalAssignedCountByUser.set(
        assignment.userId,
        (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
      );
    }

    const closingAnchorSlots = anchorSlots.filter(
      (slot) =>
        slot.category === 'closing' &&
        experiencedAnchorShiftIds.has(slot.shiftId) &&
        (assignedAnchorsByShiftId.get(slot.shiftId) ?? 0) < 2
    );
    const closingAnchorCountByUser = new Map<string, number>();
    for (const user of newAnchorUsers) {
      closingAnchorCountByUser.set(user.uid, 0);
    }

    const newAnchorClosingPhase = assignSlotsRoundRobin({
      slots: closingAnchorSlots,
      users: newAnchorUsers,
      assignedEventsByUser,
      assignedCountByUser: closingAnchorCountByUser,
      canTake: canTakeNewAnchorSlot,
      maxPerUser: 1,
      hasConflict: hasAvoidConflict,
      onAssigned: onSlotAssigned,
    });

    for (const assignment of newAnchorClosingPhase.assignments) {
      allAssignments.push({
        userId: assignment.userId,
        shiftId: assignment.shiftId,
        eventId: assignment.eventId,
        type: engagementType.ANCHOR,
      });
      plannedAssignments.push({
        userId: assignment.userId,
        shiftId: assignment.shiftId,
        eventId: assignment.eventId,
        type: engagementType.ANCHOR,
      });
      assignedAnchorsByShiftId.set(
        assignment.shiftId,
        (assignedAnchorsByShiftId.get(assignment.shiftId) ?? 0) + 1
      );
      totalAssignedCountByUser.set(
        assignment.userId,
        (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
      );
    }

    // Build tender capacity as configured tenders minus anchors already assigned.
    const assignedTendersByShiftId = new Map<string, number>();
    for (const assignment of allAssignments) {
      if (assignment.type !== engagementType.TENDER) {
        continue;
      }

      assignedTendersByShiftId.set(
        assignment.shiftId,
        (assignedTendersByShiftId.get(assignment.shiftId) ?? 0) + 1
      );
    }

    const tenderSlots: Slot[] = [];
    for (const shift of shifts) {
      const configuredTenders = Math.max(0, Number.isFinite(shift.tenders) ? shift.tenders : 0);
      const assignedAnchorsOnShift = assignedAnchorsByShiftId.get(shift.id) ?? 0;
      const assignedTendersOnShift = assignedTendersByShiftId.get(shift.id) ?? 0;
      const tenderCount = Math.max(0, configuredTenders - assignedAnchorsOnShift - assignedTendersOnShift);

      for (let i = 0; i < tenderCount; i += 1) {
        tenderSlots.push({
          id: `${shift.id}::tender::${i}`,
          shiftId: shift.id,
          eventId: shift.eventId,
          category: categoryByShiftId.get(shift.id) ?? 'other',
        });
      }
    }

    // Phase 3: Assign tenders for the remaining shift capacity
    const remainingTenderSlots = new Map<string, Slot>(tenderSlots.map((slot) => [slot.id, slot]));

    const anchorShiftIdsByUser = new Map<string, Set<string>>();
    for (const assignment of allAssignments) {
      if (assignment.type !== engagementType.ANCHOR) {
        continue;
      }

      const current = anchorShiftIdsByUser.get(assignment.userId) ?? new Set<string>();
      current.add(assignment.shiftId);
      anchorShiftIdsByUser.set(assignment.userId, current);
    }

    const regularUsers = activeUsers.filter((user) => !user.anchorOnly);

    const mandatoryEventIds = new Set((period.mandatoryEventIds ?? []).filter((id) => typeof id === 'string'));
    const unmetMandatory: Array<{ eventId: string; userId: string }> = [];

    const canTakeTenderSlot = (user: User, slot: Slot): boolean => {
      if (user.anchorOnly) {
        return false;
      }

      // Users should not be assigned to more than 5 shifts
      if ((totalAssignedCountByUser.get(user.uid) ?? 0) >= 5) {
        return false;
      }

      // If user already has an anchor shift, they should not be assigned as tender as well
      if (anchorShiftIdsByUser.get(user.uid)?.has(slot.shiftId) === true) {
        return false;
      }

      if (assignedUserIdsByShiftId.get(slot.shiftId)?.has(user.uid) === true) {
        return false;
      }

      // One shift per event: avoid assigning another shift for the same event.
      if (assignedEventsByUser.get(user.uid)?.has(slot.eventId) === true) {
        return false;
      }

      if (hasAvoidConflictOnShift(user.uid, slot.shiftId)) {
        return false;
      }

      return getResponseAvailability(responseByUserId, user.uid, slot.shiftId);
    };

    for (const mandatoryEventId of mandatoryEventIds) {
      const eventSlots = Array.from(remainingTenderSlots.values()).filter(
        (slot) => slot.eventId === mandatoryEventId
      );

      if (eventSlots.length === 0) {
        continue;
      }

      const eventAssignments = assignSlotsRoundRobin({
        slots: eventSlots,
        users: regularUsers,
        assignedEventsByUser,
        assignedCountByUser: assignedTenderCountByUser,
        canTake: canTakeTenderSlot,
        hasConflict: hasAvoidConflict,
        onAssigned: onSlotAssigned,
      });

      const assignedSlotIds = new Set(eventAssignments.assignments.map((entry) => entry.slotId));
      for (const assignment of eventAssignments.assignments) {
        const slot = eventSlots.find((candidate) => candidate.id === assignment.slotId);
        if (!slot) {
          continue;
        }

        remainingTenderSlots.delete(slot.id);
        allAssignments.push({
          userId: assignment.userId,
          shiftId: slot.shiftId,
          eventId: slot.eventId,
          type: engagementType.TENDER,
        });
        plannedAssignments.push({
          userId: assignment.userId,
          shiftId: slot.shiftId,
          eventId: slot.eventId,
          type: engagementType.TENDER,
        });
        totalAssignedCountByUser.set(
          assignment.userId,
          (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
        );
      }

      for (const user of regularUsers) {
        const canWorkMandatoryEvent = eventSlots.some((slot) => canTakeTenderSlot(user, slot));
        if (!canWorkMandatoryEvent) {
          continue;
        }

        const isAssignedOnMandatoryEvent = assignedEventsByUser.get(user.uid)?.has(mandatoryEventId) === true;
        if (!isAssignedOnMandatoryEvent) {
          unmetMandatory.push({ eventId: mandatoryEventId, userId: user.uid });
        }
      }

      for (const slot of eventSlots) {
        if (!assignedSlotIds.has(slot.id)) {
          remainingTenderSlots.set(slot.id, slot);
        }
      }
    }

    const remainingTenderSlotList = () => Array.from(remainingTenderSlots.values());

    // Soft per-user cap keeps tender load from concentrating on a few users.
    const baseMaxPerUser =
      regularUsers.length > 0
        ? Math.max(1, Math.ceil(tenderSlots.length / regularUsers.length) + 1)
        : 0;

    // Fairness pass: fill by shift category before relaxed catch-all fill.
    const categoryOrder: ShiftCategory[] = ['opening', 'closing', 'middle', 'other'];
    for (const category of categoryOrder) {
      const categorySlots = remainingTenderSlotList().filter((slot) => slot.category === category);
      if (categorySlots.length === 0) {
        continue;
      }

      const categoryAssignments = assignSlotsRoundRobin({
        slots: categorySlots,
        users: regularUsers,
        assignedEventsByUser,
        assignedCountByUser: assignedTenderCountByUser,
        canTake: canTakeTenderSlot,
        maxPerUser: baseMaxPerUser,
        hasConflict: hasAvoidConflict,
        onAssigned: onSlotAssigned,
      });

      for (const assignment of categoryAssignments.assignments) {
        const slot = categorySlots.find((candidate) => candidate.id === assignment.slotId);
        if (!slot) {
          continue;
        }

        remainingTenderSlots.delete(slot.id);
        allAssignments.push({
          userId: assignment.userId,
          shiftId: slot.shiftId,
          eventId: slot.eventId,
          type: engagementType.TENDER,
        });
        plannedAssignments.push({
          userId: assignment.userId,
          shiftId: slot.shiftId,
          eventId: slot.eventId,
          type: engagementType.TENDER,
        });
        totalAssignedCountByUser.set(
          assignment.userId,
          (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
        );
      }
    }

    // Final pass: relax category balancing to maximize total filled slots.
    const relaxedFillAssignments = assignSlotsRoundRobin({
      slots: remainingTenderSlotList(),
      users: regularUsers,
      assignedEventsByUser,
      assignedCountByUser: assignedTenderCountByUser,
      canTake: canTakeTenderSlot,
      hasConflict: hasAvoidConflict,
      onAssigned: onSlotAssigned,
    });

    for (const assignment of relaxedFillAssignments.assignments) {
      const slot = remainingTenderSlots.get(assignment.slotId);
      if (!slot) {
        continue;
      }
      remainingTenderSlots.delete(slot.id);
      allAssignments.push({
        userId: assignment.userId,
        shiftId: slot.shiftId,
        eventId: slot.eventId,
        type: engagementType.TENDER,
      });
      plannedAssignments.push({
        userId: assignment.userId,
        shiftId: slot.shiftId,
        eventId: slot.eventId,
        type: engagementType.TENDER,
      });
      totalAssignedCountByUser.set(
        assignment.userId,
        (totalAssignedCountByUser.get(assignment.userId) ?? 0) + 1
      );
    }

    const assignedAnchorCount = allAssignments.filter((a) => a.type === engagementType.ANCHOR).length;
    const assignedTenderCount = allAssignments.filter((a) => a.type === engagementType.TENDER).length;

    const newAnchorCoverageGaps = newAnchorUserIds
      .map((userId) => {
        const assignedAnchorShiftIds = allAssignments
          .filter((assignment) => assignment.type === engagementType.ANCHOR && assignment.userId === userId)
          .map((assignment) => assignment.shiftId);

        const categoriesForUser = new Set(
          assignedAnchorShiftIds
            .map((shiftId) => categoryByShiftId.get(shiftId))
            .filter((category): category is ShiftCategory => category !== undefined)
        );

        const missingCategories: Array<'opening' | 'closing'> = [];
        if (!categoriesForUser.has('opening')) {
          missingCategories.push('opening');
        }
        if (!categoriesForUser.has('closing')) {
          missingCategories.push('closing');
        }

        if (missingCategories.length === 0) {
          return null;
        }

        return {
          userId,
          missingCategories,
        };
      })
      .filter((gap): gap is { userId: string; missingCategories: Array<'opening' | 'closing'> } => gap !== null);

    if (newAnchorCoverageGaps.length > 0) {
      warnings.push({
        code: 'new_anchor_opening_closing_not_met',
        message: `${newAnchorCoverageGaps.length} new anchors did not receive both an opening and a closing anchor shift.`,
        details: {
          gaps: newAnchorCoverageGaps,
        },
      });
    }

    const tenderAssignedByShiftId = new Map<string, number>();
    for (const assignment of allAssignments) {
      if (assignment.type !== engagementType.TENDER) {
        continue;
      }
      tenderAssignedByShiftId.set(
        assignment.shiftId,
        (tenderAssignedByShiftId.get(assignment.shiftId) ?? 0) + 1
      );
    }

    const underfilledTenderShifts = shifts
      .map((shift) => {
        const configuredTenders = Math.max(0, Number.isFinite(shift.tenders) ? shift.tenders : 0);
        const assignedAnchors = assignedAnchorsByShiftId.get(shift.id) ?? 0;
        const expectedTenders = Math.max(0, configuredTenders - assignedAnchors);
        const assignedTenders = tenderAssignedByShiftId.get(shift.id) ?? 0;
        const missing = Math.max(0, expectedTenders - assignedTenders);

        if (missing === 0) {
          return null;
        }

        return {
          shiftId: shift.id,
          eventId: shift.eventId,
          configuredTenders,
          assignedAnchors,
          expectedTenders,
          assignedTenders,
          missing,
        };
      })
      .filter(
        (
          entry
        ): entry is {
          shiftId: string;
          eventId: string;
          configuredTenders: number;
          assignedAnchors: number;
          expectedTenders: number;
          assignedTenders: number;
          missing: number;
        } => entry !== null
      );

    if (underfilledTenderShifts.length > 0) {
      warnings.push({
        code: 'underfilled_tender_shifts',
        message: `${underfilledTenderShifts.length} shifts are underfilled on tenders compared to configured tender counts.`,
        details: {
          shifts: underfilledTenderShifts,
        },
      });
    }

    // Persist generated engagements, period stats, and anchor role promotions.
    const { replacedEngagementCount, createdEngagementCount } = await persistPlannerResult({
      envRef,
      periodRef,
      periodId,
      generatedBy: uid,
      eventIds,
      shifts,
      assignments: plannedAssignments,
      newAnchorUserIds,
      expectedSubmissions: requiredSurveyUsers.length,
      submittedCount: requiredSurveyUsers.length - missingSubmissionUserIds.length,
      assignedAnchorCount,
      assignedTenderCount,
      unfilledAnchorSlots: unresolvedAnchorSlots.length,
      unfilledTenderSlots: remainingTenderSlots.size,
    });

    return {
      success: true,
      periodId,
      env,
      replacedEngagementCount,
      createdEngagementCount,
      assignedAnchorCount,
      assignedTenderCount,
      unfilledTenderSlots: remainingTenderSlots.size,
      unmetMandatoryCount: unmetMandatory.length,
      unmetMandatory,
      missingSubmissionUserIds,
      afterDeadline,
      allSubmitted,
      warnings,
    };
  }
);
