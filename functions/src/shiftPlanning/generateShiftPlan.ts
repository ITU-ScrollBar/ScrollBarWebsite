import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { engagementType, Role } from '../types/types-file';
import {
  User,
  ShiftCategory,
  Slot,
  assignSlotsRoundRobin,
  getResponseAvailability,
  getShiftCategoryMap,
  resolveSurveyType,
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
  periodId?: string;
};

type GenerateShiftPlanWarning = {
  code:
    | 'shift_missing_category'
    | 'shift_missing_experienced_anchor'
    | 'new_anchor_opening_closing_not_met'
    | 'shift_has_no_anchor'
    | 'underfilled_tender_shifts'
    | 'mandatory_assignment_not_met';
  message: string;
  details: Record<string, unknown>;
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
    const env = process.env.VITE_APP_ENV || 'dev';
    const periodId = request.data?.periodId?.trim();

    if (!periodId) {
      throw new HttpsError('invalid-argument', 'Missing required field: periodId.');
    }

    // Guard: planner generation is restricted to shift managers.
    await assertCallerCanGenerate(uid);

    // Load immutable planning context (period, event scope, submission window).
    const { envRef, periodRef, period, eventIds } = await loadPlanningPeriodContext(
      env,
      periodId
    );
    const surveyType = resolveSurveyType(period);
    const includeShiftStatusQuestions = surveyType === 'regularSemesterSurvey';

    const { users, requiredSurveyUsers } = await loadEligibleUsers({
      surveyType,
    });
    const responseByUserId = await loadResponsesByUserId(envRef, periodId);

    const missingSubmissionUserIdSet = new Set(
      requiredSurveyUsers
        .filter((user) => !responseByUserId.has(user.uid))
        .map((user) => user.uid)
    );

    // Materialize shifts participating in this planning period.
    const shifts = await loadShiftsForEvents(envRef, eventIds);
    const existingAssignments = await loadExistingAssignmentsForShifts(envRef, shifts);

    // Shift categories are used to spread opening/closing/middle work fairly.
    const categoryByShiftId = getShiftCategoryMap(shifts);

    // Satellite shifts (linkedShiftId set) share the primary shift's availability — users
    // only fill out availability for the primary time slot, not the satellite separately.
    const primaryShiftIdByLinkedId = new Map<string, string>();
    for (const shift of shifts) {
      if (shift.linkedShiftId) {
        primaryShiftIdByLinkedId.set(shift.id, shift.linkedShiftId);
      }
    }
    const effectiveAvailability = (userId: string, shiftId: string): boolean => {
      const lookupId = primaryShiftIdByLinkedId.get(shiftId) ?? shiftId;
      return getResponseAvailability(responseByUserId, userId, lookupId);
    };

    // Warn about any shifts missing an explicit category — the migration should have set these.
    for (const shift of shifts) {
      if (!categoryByShiftId.has(shift.id)) {
        warnings.push({
          code: 'shift_missing_category',
          message: `Shift "${shift.title}" has no category set. Please set Opening, Middle, or Closing on this shift. Opening/closing caps will not be applied to it.`,
          details: { shiftId: shift.id, eventId: shift.eventId },
        });
      }
    }

    // Mandatory events assign all eligible tenders regardless of capacity — exclude them from slot pools
    // and from the opening/closing cap counts.
    const mandatoryEventIds = new Set((period.mandatoryEventIds ?? []).filter((id) => typeof id === 'string'));

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

      const participationStatus = missingSubmissionUserIdSet.has(user.uid)
        ? 'leave'
        : (response?.participationStatus ?? 'active');
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

    // All users who want to become an anchor are promoted to Role.ANCHOR on persistence,
    // regardless of whether they were assigned any anchor shifts. The role represents
    // intent and eligibility, not shift outcome — shift coverage is tracked via warnings.
    const newAnchorUserIds = userList
      .filter((user) => user.wantsAnchor && !user.experiencedAnchor)
      .map((user) => user.uid);
    const newAnchorUserIdSet = new Set(newAnchorUserIds);

    // Compute unified role updates: passive/legacy corrections + new anchor promotions.
    // Applied in one write per user so there are no races between concurrent transforms.
    const roleUpdates: Array<{ userId: string; roles: string[] }> = [];
    for (const user of userList) {
      if (user.participationStatus === 'leave') continue;

      const current = user.roles;
      let base = current.filter((r) => r !== Role.PASSIVE && r !== Role.LEGACY);

      if (newAnchorUserIdSet.has(user.uid) && !base.includes(Role.ANCHOR)) {
        base = [...base, Role.ANCHOR];
      }

      const newRoles =
        user.participationStatus === 'passive'
          ? [...base, Role.PASSIVE]
          : user.participationStatus === 'legacy'
          ? [...base, Role.LEGACY]
          : base;

      const changed =
        newRoles.length !== current.length ||
        newRoles.some((r) => !current.includes(r));

      if (changed) {
        roleUpdates.push({ userId: user.uid, roles: newRoles });
      }
    }

    const activeUsers = userList.filter((user) => user.participationStatus === 'active');
    const userById = new Map(userList.map((user) => [user.uid, user]));

    const avoidShiftWithByUserId = new Map<string, Set<string>>(
      userList.map((user) => [user.uid, new Set(user.avoidShiftWithUserIds ?? [])])
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

    const onTenderSlotAssigned = (user: User, slot: Slot): void => {
      markAssignedToShift(user.uid, slot.shiftId);
      totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);
      if (slot.category === 'opening') {
        assignedOpeningCountByUser.set(user.uid, (assignedOpeningCountByUser.get(user.uid) ?? 0) + 1);
      } else if (slot.category === 'closing') {
        assignedClosingCountByUser.set(user.uid, (assignedClosingCountByUser.get(user.uid) ?? 0) + 1);
      }
    };

    // Tracks enforce fairness and one-event-per-user constraints during assignment.
    const assignedEventsByUser = new Map<string, Set<string>>();
    const assignedAnchorCountByUser = new Map<string, number>();
    const assignedTenderCountByUser = new Map<string, number>();
    const totalAssignedCountByUser = new Map<string, number>();
    // Per-category caps (max 2 opening, 2 closing per user per period; mandatory events excluded).
    const assignedOpeningCountByUser = new Map<string, number>();
    const assignedClosingCountByUser = new Map<string, number>();

    for (const user of userList) {
      assignedEventsByUser.set(user.uid, new Set<string>());
      assignedAnchorCountByUser.set(user.uid, 0);
      assignedTenderCountByUser.set(user.uid, 0);
      totalAssignedCountByUser.set(user.uid, 0);
      assignedOpeningCountByUser.set(user.uid, 0);
      assignedClosingCountByUser.set(user.uid, 0);
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

      // Seed opening/closing caps from pre-existing assignments; mandatory events are excluded.
      if (!mandatoryEventIds.has(assignment.eventId)) {
        const cat = categoryByShiftId.get(assignment.shiftId);
        if (cat === 'opening') {
          assignedOpeningCountByUser.set(assignment.userId, (assignedOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
        } else if (cat === 'closing') {
          assignedClosingCountByUser.set(assignment.userId, (assignedClosingCountByUser.get(assignment.userId) ?? 0) + 1);
        }
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
      return effectiveAvailability(user.uid, slot.shiftId);
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
      if (!mandatoryEventIds.has(slot.eventId)) {
        if (slot.category === 'opening') {
          assignedOpeningCountByUser.set(assignment.userId, (assignedOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
        } else if (slot.category === 'closing') {
          assignedClosingCountByUser.set(assignment.userId, (assignedClosingCountByUser.get(assignment.userId) ?? 0) + 1);
        }
      }
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

    for (const shift of shifts) {
      const hasAnyAnchor = (assignedAnchorsByShiftId.get(shift.id) ?? 0) > 0;
      if (hasAnyAnchor && !experiencedAnchorShiftIds.has(shift.id)) {
        warnings.push({
          code: 'shift_missing_experienced_anchor',
          message: `Shift "${shift.title}" has no experienced anchor assigned`,
          details: { shiftId: shift.id, eventId: shift.eventId },
        });
      }
    }

    const newAnchorUsers = anchorUsers.filter((user) => !user.experiencedAnchor);

    // Determine anchor seminar cutoff: the most-voted day across new anchor responses.
    // New anchor shifts (Phase 2) must start on or after this date.
    let anchorSeminarCutoff: Date | null = null;
    const periodAnchorSeminarDays = (period.anchorSeminarDays ?? []) as string[];
    if (periodAnchorSeminarDays.length > 0) {
      const dayVotes = new Map<string, number>();
      for (const user of newAnchorUsers) {
        for (const day of ((responseByUserId.get(user.uid)?.anchorSeminarDays ?? []) as string[])) {
          dayVotes.set(day, (dayVotes.get(day) ?? 0) + 1);
        }
      }
      let topDay: string | null = null;
      let topVotes = 0;
      for (const [day, votes] of dayVotes) {
        if (votes > topVotes) {
          topDay = day;
          topVotes = votes;
        }
      }
      if (topDay) {
        // Parse as UTC midnight — shift.start values from Firestore are UTC timestamps,
        // so this comparison is apples-to-apples.
        anchorSeminarCutoff = new Date(topDay + 'T00:00:00.000Z');
      }
    }

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

      return effectiveAvailability(user.uid, slot.shiftId);
    };

    const openingAnchorSlots = shifts
      .filter(
        (shift) =>
          categoryByShiftId.get(shift.id) === 'opening' &&
          !mandatoryEventIds.has(shift.eventId) &&
          experiencedAnchorShiftIds.has(shift.id) &&
          (assignedAnchorsByShiftId.get(shift.id) ?? 0) < 2 &&
          (anchorSeminarCutoff === null || shift.start >= anchorSeminarCutoff)
      )
      .map((shift) => ({
        id: `${shift.id}::new-anchor`,
        shiftId: shift.id,
        eventId: shift.eventId,
        category: 'opening' as ShiftCategory,
      }));
    const openingAnchorCountByUser = new Map<string, number>();
    for (const user of newAnchorUsers) {
      const existingCount = allAssignments.filter(
        (a) => a.userId === user.uid && a.type === engagementType.ANCHOR && categoryByShiftId.get(a.shiftId) === 'opening'
      ).length;
      openingAnchorCountByUser.set(user.uid, existingCount);
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
      if (!mandatoryEventIds.has(assignment.eventId)) {
        assignedOpeningCountByUser.set(assignment.userId, (assignedOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
      }
    }

    const closingAnchorSlots = shifts
      .filter(
        (shift) =>
          categoryByShiftId.get(shift.id) === 'closing' &&
          !mandatoryEventIds.has(shift.eventId) &&
          experiencedAnchorShiftIds.has(shift.id) &&
          (assignedAnchorsByShiftId.get(shift.id) ?? 0) < 2 &&
          (anchorSeminarCutoff === null || shift.start >= anchorSeminarCutoff)
      )
      .map((shift) => ({
        id: `${shift.id}::new-anchor`,
        shiftId: shift.id,
        eventId: shift.eventId,
        category: 'closing' as ShiftCategory,
      }));
    const closingAnchorCountByUser = new Map<string, number>();
    for (const user of newAnchorUsers) {
      const existingCount = allAssignments.filter(
        (a) => a.userId === user.uid && a.type === engagementType.ANCHOR && categoryByShiftId.get(a.shiftId) === 'closing'
      ).length;
      closingAnchorCountByUser.set(user.uid, existingCount);
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
      if (!mandatoryEventIds.has(assignment.eventId)) {
        assignedClosingCountByUser.set(assignment.userId, (assignedClosingCountByUser.get(assignment.userId) ?? 0) + 1);
      }
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
      // Mandatory event shifts have no capacity cap; the mandatory loop handles all their assignments.
      if (mandatoryEventIds.has(shift.eventId)) {
        continue;
      }

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
    const unmetMandatoryWarnings: Array<{ eventId: string; userId: string }> = [];

    const canTakeTenderSlot = (user: User, slot: Slot): boolean => {
      if (user.anchorOnly) {
        return false;
      }

      // Users should not be assigned to more than 5 shifts
      if ((totalAssignedCountByUser.get(user.uid) ?? 0) >= 5) {
        return false;
      }

      // Per-period cap: at most 2 opening and 2 closing shifts (mandatory events excluded).
      if (slot.category === 'opening' && (assignedOpeningCountByUser.get(user.uid) ?? 0) >= 2) {
        return false;
      }
      if (slot.category === 'closing' && (assignedClosingCountByUser.get(user.uid) ?? 0) >= 2) {
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

      return effectiveAvailability(user.uid, slot.shiftId);
    };

    for (const mandatoryEventId of mandatoryEventIds) {
      const eventShifts = shifts.filter((shift) => shift.eventId === mandatoryEventId);
      if (eventShifts.length === 0) {
        continue;
      }

      for (const user of regularUsers) {
        // Skip if already assigned to this event
        if (assignedEventsByUser.get(user.uid)?.has(mandatoryEventId) === true) {
          continue;
        }

        // Respect the 5-shift cap
        if ((totalAssignedCountByUser.get(user.uid) ?? 0) >= 5) {
          continue;
        }

        // Find any shift in this event the user can take (ignoring slot capacity)
        const availableShift = eventShifts.find((shift) =>
          anchorShiftIdsByUser.get(user.uid)?.has(shift.id) !== true &&
          assignedUserIdsByShiftId.get(shift.id)?.has(user.uid) !== true &&
          !hasAvoidConflictOnShift(user.uid, shift.id) &&
          effectiveAvailability(user.uid, shift.id)
        );

        if (availableShift) {
          markAssignedToShift(user.uid, availableShift.id);
          totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);
          assignedTenderCountByUser.set(user.uid, (assignedTenderCountByUser.get(user.uid) ?? 0) + 1);
          const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
          userEvents.add(mandatoryEventId);
          assignedEventsByUser.set(user.uid, userEvents);
          allAssignments.push({ userId: user.uid, shiftId: availableShift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
          plannedAssignments.push({ userId: user.uid, shiftId: availableShift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
        } else {
          // Only flag as unmet if the user had availability for at least one shift in this event
          const couldWork = eventShifts.some((shift) =>
            effectiveAvailability(user.uid, shift.id)
          );
          if (couldWork) {
            unmetMandatoryWarnings.push({ eventId: mandatoryEventId, userId: user.uid });
          }
        }
      }
    }

    for (const { eventId, userId } of unmetMandatoryWarnings) {
      warnings.push({
        code: 'mandatory_assignment_not_met',
        message: `${userById.get(userId)?.displayName ?? userId} indicated availability for a mandatory event but could not be assigned`,
        details: { userId, eventId },
      });
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
        onAssigned: onTenderSlotAssigned,
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
      onAssigned: onTenderSlotAssigned,
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
    }

    const assignedAnchorCount = plannedAssignments.filter((a) => a.type === engagementType.ANCHOR).length;
    const assignedTenderCount = plannedAssignments.filter((a) => a.type === engagementType.TENDER).length;

    for (const userId of newAnchorUserIds) {
      const assignedAnchorShiftIds = allAssignments
        .filter((assignment) => assignment.type === engagementType.ANCHOR && assignment.userId === userId)
        .map((assignment) => assignment.shiftId);

      const categoriesForUser = new Set(
        assignedAnchorShiftIds
          .map((shiftId) => categoryByShiftId.get(shiftId))
          .filter((category): category is ShiftCategory => category !== undefined)
      );

      const missingOpening = !categoriesForUser.has('opening');
      const missingClosing = !categoriesForUser.has('closing');

      if (!missingOpening && !missingClosing) {
        continue;
      }

      const displayName = userById.get(userId)?.displayName ?? userId;
      let missingLabel: string;
      if (missingOpening && missingClosing) {
        missingLabel = 'any';
      } else if (missingOpening) {
        missingLabel = 'an opening';
      } else {
        missingLabel = 'a closing';
      }

      warnings.push({
        code: 'new_anchor_opening_closing_not_met',
        message: `${displayName} did not receive ${missingLabel} anchor shift`,
        details: { userId, missingOpening, missingClosing },
      });
    }

    for (const shift of shifts) {
      if ((assignedAnchorsByShiftId.get(shift.id) ?? 0) === 0) {
        warnings.push({
          code: 'shift_has_no_anchor',
          message: `Shift "${shift.title}" has no anchor assigned`,
          details: { shiftId: shift.id, eventId: shift.eventId },
        });
      }
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
        // Mandatory event shifts have no capacity cap, so underfill doesn't apply.
        if (mandatoryEventIds.has(shift.eventId)) {
          return null;
        }

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

    // Persist generated engagements, period stats, and role corrections.
    const { createdEngagementCount } = await persistPlannerResult({
      envRef,
      periodRef,
      periodId,
      generatedBy: uid,
      eventIds,
      shifts,
      assignments: plannedAssignments,
      roleUpdates,
      expectedSubmissions: requiredSurveyUsers.length,
      submittedCount: requiredSurveyUsers.length - missingSubmissionUserIdSet.size,
      assignedAnchorCount,
      assignedTenderCount,
      unfilledAnchorSlots: shifts.filter((s) => (assignedAnchorsByShiftId.get(s.id) ?? 0) === 0).length,
      unfilledTenderSlots: remainingTenderSlots.size,
    });

    return {
      success: true,
      periodId,
      env,
      createdEngagementCount,
      assignedAnchorCount,
      assignedTenderCount,
      unfilledTenderSlots: remainingTenderSlots.size,
      warnings,
    };
  }
);
