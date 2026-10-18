import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { engagementType, Role, Shift } from '../types/types-file';
import {
  User,
  ShiftCategory,
  Slot,
  getResponseAvailability,
  getShiftCategoryMap,
  resolveSurveyType,
  shuffle,
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
    // Guard: generation only ever runs once per period from a clean state. Reset the period
    // first if you want to change anything and regenerate — this keeps the pre-generation
    // snapshot (see persistPlannerResult) meaningful and avoids reasoning about fairness
    // across multiple partial runs.
    if (period.status === 'generated') {
      throw new HttpsError(
        'failed-precondition',
        'This period has already been generated. Reset it before generating again.'
      );
    }

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
    const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));

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

    // Start times of each person's non-mandatory shifts, used to spread their shifts out over the
    // period instead of bunching them at the start or end. Mandatory events (big parties) are
    // left out on purpose — everyone works those regardless, so they say nothing about spread.
    const nonMandatoryShiftTimesByUser = new Map<string, number[]>();
    const recordShiftTime = (userId: string, shiftId: string): void => {
      const shift = shiftById.get(shiftId);
      if (!shift || mandatoryEventIds.has(shift.eventId)) {
        return;
      }
      const times = nonMandatoryShiftTimesByUser.get(userId) ?? [];
      times.push(shift.start.getTime());
      nonMandatoryShiftTimesByUser.set(userId, times);
    };

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
    // previousRoles is carried alongside so persistPlannerResult can snapshot it — "Reset
    // period" needs to restore exactly this, otherwise a promoted new anchor would read as
    // an experienced anchor (hasAnchorRole) on a later regenerate for the same period.
    const roleUpdates: Array<{ userId: string; roles: string[]; previousRoles: string[] }> = [];
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
        roleUpdates.push({ userId: user.uid, roles: newRoles, previousRoles: current });
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
      recordShiftTime(userId, shiftId);
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

    const usersAvoidEachOther = (a: string, b: string): boolean =>
      avoidShiftWithByUserId.get(a)?.has(b) === true || avoidShiftWithByUserId.get(b)?.has(a) === true;

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
    // Dynamic per-period caps (see perUserOpeningCap/perUserClosingCap further down); mandatory
    // events are excluded from these two so mandatory duty never eats into the capped allowance.
    const assignedOpeningCountByUser = new Map<string, number>();
    const assignedClosingCountByUser = new Map<string, number>();
    // True total exposure regardless of mandatory/anchor-vs-tender — used only to steer mandatory
    // placement toward whichever category a person is currently lower on, never for caps.
    const totalOpeningCountByUser = new Map<string, number>();
    const totalClosingCountByUser = new Map<string, number>();

    for (const user of userList) {
      assignedEventsByUser.set(user.uid, new Set<string>());
      assignedAnchorCountByUser.set(user.uid, 0);
      assignedTenderCountByUser.set(user.uid, 0);
      totalAssignedCountByUser.set(user.uid, 0);
      assignedOpeningCountByUser.set(user.uid, 0);
      assignedClosingCountByUser.set(user.uid, 0);
      totalOpeningCountByUser.set(user.uid, 0);
      totalClosingCountByUser.set(user.uid, 0);
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

      // Seed opening/closing counters from pre-existing assignments. The capped counters
      // exclude mandatory events; the true-total counters always count everything.
      const preExistingCategory = categoryByShiftId.get(assignment.shiftId);
      if (preExistingCategory === 'opening') {
        totalOpeningCountByUser.set(assignment.userId, (totalOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
      } else if (preExistingCategory === 'closing') {
        totalClosingCountByUser.set(assignment.userId, (totalClosingCountByUser.get(assignment.userId) ?? 0) + 1);
      }
      if (!mandatoryEventIds.has(assignment.eventId)) {
        if (preExistingCategory === 'opening') {
          assignedOpeningCountByUser.set(assignment.userId, (assignedOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
        } else if (preExistingCategory === 'closing') {
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

    // Live-updated as anchor assignments are made across phases 1, 2, and 4, so phases 3 and 5
    // (which both need to know who's already anchoring which shift) always see the full picture.
    const anchorShiftIdsByUser = new Map<string, Set<string>>();
    for (const assignment of existingAssignments) {
      if (assignment.type !== engagementType.ANCHOR) {
        continue;
      }
      const preExisting = anchorShiftIdsByUser.get(assignment.userId) ?? new Set<string>();
      preExisting.add(assignment.shiftId);
      anchorShiftIdsByUser.set(assignment.userId, preExisting);
    }
    const recordAnchorAssignment = (userId: string, shiftId: string): void => {
      const current = anchorShiftIdsByUser.get(userId) ?? new Set<string>();
      current.add(shiftId);
      anchorShiftIdsByUser.set(userId, current);
    };

    // Dynamic per-period caps, scaled to this period's own non-mandatory shift-to-member ratio
    // instead of a fixed number — mirrors the "shifts per member" stat already shown in the
    // admin UI. Mandatory events are excluded from the capacity totals since mandatory duty is
    // guaranteed regardless of load, not something these caps are meant to bound.
    const sumNonMandatoryTenders = (predicate: (shift: Shift) => boolean): number =>
      shifts
        .filter((shift) => !mandatoryEventIds.has(shift.eventId) && predicate(shift))
        .reduce((sum, shift) => sum + (Number.isFinite(shift.tenders) ? shift.tenders : 0), 0);

    const perMemberCap = (capacity: number): number =>
      activeUsers.length > 0 ? Math.max(1, Math.ceil(capacity / activeUsers.length)) : 1;

    const perUserTotalCap = perMemberCap(sumNonMandatoryTenders(() => true));
    const perUserOpeningCap = perMemberCap(sumNonMandatoryTenders((shift) => categoryByShiftId.get(shift.id) === 'opening'));
    const perUserClosingCap = perMemberCap(sumNonMandatoryTenders((shift) => categoryByShiftId.get(shift.id) === 'closing'));

    // Spread: prefer shifts far (in days) from the person's other non-mandatory shifts. The gap
    // is capped at the "ideal" spacing (period length / cap) so that once a shift is far enough
    // away, the other tie-breakers (category, how full a shift is) decide instead.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const nonMandatoryStartTimes = shifts
      .filter((shift) => !mandatoryEventIds.has(shift.eventId))
      .map((shift) => shift.start.getTime());
    const periodSpanMs =
      nonMandatoryStartTimes.length > 0
        ? Math.max(...nonMandatoryStartTimes) - Math.min(...nonMandatoryStartTimes)
        : 0;
    const idealGapDays = Math.max(1, Math.floor(periodSpanMs / perUserTotalCap / DAY_MS));
    const spreadScore = (userId: string, shiftId: string): number => {
      const shift = shiftById.get(shiftId);
      if (!shift || mandatoryEventIds.has(shift.eventId)) {
        return 0;
      }
      const times = nonMandatoryShiftTimesByUser.get(userId) ?? [];
      if (times.length === 0) {
        return idealGapDays;
      }
      const start = shift.start.getTime();
      const nearestGapMs = Math.min(...times.map((time) => Math.abs(start - time)));
      return Math.min(idealGapDays, Math.floor(nearestGapMs / DAY_MS));
    };

    // Build anchor capacity (at least one anchor slot per shift). Mandatory shifts get their own
    // pool, filled in Phase 4 after non-mandatory tenders so it's informed by the full picture.
    const anchorSlots: Slot[] = [];
    const mandatoryAnchorSlots: Slot[] = [];
    for (const shift of shifts) {
      const existingAnchors = assignedAnchorsByShiftId.get(shift.id) ?? 0;
      if (existingAnchors >= 1) {
        continue;
      }

      const slot: Slot = {
        id: `${shift.id}::anchor`,
        shiftId: shift.id,
        eventId: shift.eventId,
        category: categoryByShiftId.get(shift.id) ?? 'other',
      };

      if (mandatoryEventIds.has(shift.eventId)) {
        mandatoryAnchorSlots.push(slot);
      } else {
        anchorSlots.push(slot);
      }
    }

    const anchorUsers = activeUsers.filter((user) => user.wantsAnchor);
    const newAnchorUsers = anchorUsers.filter((user) => !user.experiencedAnchor);
    // anchorOnly members have no tender fallback — their entire workload comes from anchor
    // duty, so they get priority access to the shared fair-share cap ahead of mixed anchors.
    // New anchors are in these lists too; canTakeAnchorSlot only lets them anchor alone once
    // they've finished their training shifts (Phase 1a).
    const anchorOnlyCandidates = anchorUsers.filter((user) => user.anchorOnly);
    const mixedAnchorCandidates = anchorUsers.filter((user) => !user.anchorOnly);

    // Shifts that have at least one experienced anchor on them, kept live across phases.
    const experiencedAnchorShiftIds = new Set<string>();
    for (const assignment of existingAssignments) {
      if (assignment.type === engagementType.ANCHOR && userById.get(assignment.userId)?.experiencedAnchor === true) {
        experiencedAnchorShiftIds.add(assignment.shiftId);
      }
    }

    // New anchor training: the opening and closing shift each new anchor works next to an
    // experienced anchor, and the time the later of the two ends. After that they count as a
    // regular anchor and can be the only anchor on a shift.
    const trainingShiftIdByUser = new Map<string, { opening?: string; closing?: string }>();
    const trainingCompleteAtByUser = new Map<string, number>();

    const canAnchorShift = (user: User, shiftId: string): boolean => {
      if (!user.wantsAnchor || user.participationStatus !== 'active') {
        return false;
      }
      if (user.experiencedAnchor) {
        return true;
      }
      const trainedAt = trainingCompleteAtByUser.get(user.uid);
      const shift = shiftById.get(shiftId);
      return trainedAt !== undefined && shift !== undefined && shift.start.getTime() >= trainedAt;
    };

    // Shared bookkeeping for every anchor placement (Phases 1a, 1 and 4).
    const assignAnchor = (user: User, slot: { shiftId: string; eventId: string; category: ShiftCategory }): void => {
      allAssignments.push({ userId: user.uid, shiftId: slot.shiftId, eventId: slot.eventId, type: engagementType.ANCHOR });
      plannedAssignments.push({ userId: user.uid, shiftId: slot.shiftId, eventId: slot.eventId, type: engagementType.ANCHOR });

      markAssignedToShift(user.uid, slot.shiftId);
      recordAnchorAssignment(user.uid, slot.shiftId);
      if (user.experiencedAnchor) {
        experiencedAnchorShiftIds.add(slot.shiftId);
      }
      assignedAnchorsByShiftId.set(slot.shiftId, (assignedAnchorsByShiftId.get(slot.shiftId) ?? 0) + 1);
      assignedAnchorCountByUser.set(user.uid, (assignedAnchorCountByUser.get(user.uid) ?? 0) + 1);
      totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);

      const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
      userEvents.add(slot.eventId);
      assignedEventsByUser.set(user.uid, userEvents);

      if (slot.category === 'opening') {
        totalOpeningCountByUser.set(user.uid, (totalOpeningCountByUser.get(user.uid) ?? 0) + 1);
      } else if (slot.category === 'closing') {
        totalClosingCountByUser.set(user.uid, (totalClosingCountByUser.get(user.uid) ?? 0) + 1);
      }
      if (!mandatoryEventIds.has(slot.eventId)) {
        if (slot.category === 'opening') {
          assignedOpeningCountByUser.set(user.uid, (assignedOpeningCountByUser.get(user.uid) ?? 0) + 1);
        } else if (slot.category === 'closing') {
          assignedClosingCountByUser.set(user.uid, (assignedClosingCountByUser.get(user.uid) ?? 0) + 1);
        }
      }
    };

    // How strictly the fair-share caps apply to an anchor placement:
    //   capped   — total + opening/closing caps (Phase 1 first pass).
    //   relaxed  — total cap only. Having an anchor on every shift matters more than keeping
    //              someone's opening/closing split even, so leftover slots get a second pass.
    //   uncapped — no caps (Phase 4, mandatory is an add-on; Phase 1's last pass, since an
    //              anchor over their cap beats a shift with none; and the last-resort mentor
    //              search for new anchor training).
    type AnchorCapMode = 'capped' | 'relaxed' | 'uncapped';
    type TrainingCategory = 'opening' | 'closing';

    const canTakeAnchorSlot = (user: User, slot: Slot, mode: AnchorCapMode): boolean => {
      if (!canAnchorShift(user, slot.shiftId)) {
        return false;
      }
      if (assignedUserIdsByShiftId.get(slot.shiftId)?.has(user.uid) === true) {
        return false;
      }
      // One shift per event, whether anchor or tender — without this, one anchor could be
      // matched to two different shifts of the same event (e.g. its opening and closing shift
      // both needing an anchor).
      if (assignedEventsByUser.get(user.uid)?.has(slot.eventId) === true) {
        return false;
      }
      if (mode !== 'uncapped' && (totalAssignedCountByUser.get(user.uid) ?? 0) >= perUserTotalCap) {
        return false;
      }
      if (mode === 'capped') {
        if (slot.category === 'opening' && (totalOpeningCountByUser.get(user.uid) ?? 0) >= perUserOpeningCap) {
          return false;
        }
        if (slot.category === 'closing' && (totalClosingCountByUser.get(user.uid) ?? 0) >= perUserClosingCap) {
          return false;
        }
      }
      if (hasAvoidConflictOnShift(user.uid, slot.shiftId)) {
        return false;
      }
      return effectiveAvailability(user.uid, slot.shiftId);
    };

    // Determine anchor seminar cutoff: the most-voted day across new anchor responses.
    // New anchor training shifts (Phase 1a) must start on or after this date.
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

    const remainingAnchorSlots = new Map<string, Slot>(anchorSlots.map((slot) => [slot.id, slot]));

    // Phase 1a: new anchor training. Runs before experienced anchors are spread out, so each new
    // anchor can be paired with an experienced anchor on the EARLIEST opening and closing shift
    // that works for both, instead of only picking from shifts Phase 1 happened to anchor.
    const headcountOnShift = (shiftId: string): number => assignedUserIdsByShiftId.get(shiftId)?.size ?? 0;
    const hasRoomFor = (shift: Shift, people: number): boolean =>
      headcountOnShift(shift.id) + people <= Math.max(0, shift.tenders);

    const trainingShiftsFor = (user: User, category: TrainingCategory): Shift[] =>
      shifts
        .filter(
          (shift) =>
            categoryByShiftId.get(shift.id) === category &&
            !mandatoryEventIds.has(shift.eventId) &&
            (anchorSeminarCutoff === null || shift.start >= anchorSeminarCutoff) &&
            (assignedAnchorsByShiftId.get(shift.id) ?? 0) < 2 &&
            hasRoomFor(shift, 1) &&
            assignedUserIdsByShiftId.get(shift.id)?.has(user.uid) !== true &&
            assignedEventsByUser.get(user.uid)?.has(shift.eventId) !== true &&
            !hasAvoidConflictOnShift(user.uid, shift.id) &&
            effectiveAvailability(user.uid, shift.id)
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const findMentor = (trainee: User, slot: Slot, mode: AnchorCapMode): User | undefined => {
      const mentors = shuffle(anchorUsers).filter(
        (user) =>
          user.experiencedAnchor &&
          !usersAvoidEachOther(user.uid, trainee.uid) &&
          canTakeAnchorSlot(user, slot, mode)
      );
      mentors.sort(
        (a, b) => (totalAssignedCountByUser.get(a.uid) ?? 0) - (totalAssignedCountByUser.get(b.uid) ?? 0)
      );
      return mentors[0];
    };

    // How a trainee could train on a shift under `mode`: next to an experienced anchor already
    // there, or together with a mentor placed for them. Undefined if neither works.
    type TrainingOption = { shift: Shift; slot: Slot; mentor?: User };
    const trainingOption = (
      trainee: User,
      shift: Shift,
      category: TrainingCategory,
      mode: AnchorCapMode
    ): TrainingOption | undefined => {
      const slot: Slot = { id: `${shift.id}::anchor`, shiftId: shift.id, eventId: shift.eventId, category };
      if (experiencedAnchorShiftIds.has(shift.id)) {
        return hasRoomFor(shift, 1) ? { shift, slot } : undefined;
      }
      if ((assignedAnchorsByShiftId.get(shift.id) ?? 0) > 0 || !remainingAnchorSlots.has(slot.id) || !hasRoomFor(shift, 2)) {
        return undefined;
      }
      const mentor = findMentor(trainee, slot, mode);
      return mentor ? { shift, slot, mentor } : undefined;
    };

    const placeTrainingOption = (trainee: User, option: TrainingOption): void => {
      if (option.mentor) {
        remainingAnchorSlots.delete(option.slot.id);
        assignAnchor(option.mentor, option.slot);
      }
      assignAnchor(trainee, option.slot);
    };

    const TRAINING_MODES: AnchorCapMode[] = ['capped', 'relaxed', 'uncapped'];

    // The opening + closing pair (on different events) that finishes training earliest. Mentors
    // under the normal caps are tried first, then without opening/closing caps, then uncapped.
    const bestTrainingPair = (trainee: User): { opening: TrainingOption; closing: TrainingOption; mode: AnchorCapMode } | undefined => {
      const openingShifts = trainingShiftsFor(trainee, 'opening');
      const closingShifts = trainingShiftsFor(trainee, 'closing');
      for (const mode of TRAINING_MODES) {
        const openings = openingShifts
          .map((shift) => trainingOption(trainee, shift, 'opening', mode))
          .filter((option): option is TrainingOption => option !== undefined);
        const closings = closingShifts
          .map((shift) => trainingOption(trainee, shift, 'closing', mode))
          .filter((option): option is TrainingOption => option !== undefined);

        let best: { opening: TrainingOption; closing: TrainingOption } | undefined;
        let bestFinish = Infinity;
        let bestFirstStart = Infinity;
        for (const opening of openings) {
          for (const closing of closings) {
            if (opening.shift.eventId === closing.shift.eventId) {
              continue;
            }
            const finish = Math.max(opening.shift.end.getTime(), closing.shift.end.getTime());
            const firstStart = Math.min(opening.shift.start.getTime(), closing.shift.start.getTime());
            if (finish < bestFinish || (finish === bestFinish && firstStart < bestFirstStart)) {
              best = { opening, closing };
              bestFinish = finish;
              bestFirstStart = firstStart;
            }
          }
        }
        if (best) {
          return { ...best, mode };
        }
      }
      return undefined;
    };

    // Earliest single shift of one category, for when no full pair exists.
    const placeSingleTraining = (trainee: User, category: TrainingCategory): Shift | undefined => {
      const candidates = trainingShiftsFor(trainee, category);
      for (const mode of TRAINING_MODES) {
        for (const shift of candidates) {
          const option = trainingOption(trainee, shift, category, mode);
          if (option) {
            placeTrainingOption(trainee, option);
            return shift;
          }
        }
      }
      return undefined;
    };

    // Most constrained trainees first, so someone with only a couple of workable shifts isn't
    // beaten to them by someone who had plenty of options.
    const traineeOptionCount = (user: User): number =>
      trainingShiftsFor(user, 'opening').length + trainingShiftsFor(user, 'closing').length;
    const trainees = shuffle(newAnchorUsers).sort((a, b) => traineeOptionCount(a) - traineeOptionCount(b));

    for (const trainee of trainees) {
      const training: { opening?: string; closing?: string } = {};
      const pair = bestTrainingPair(trainee);
      if (pair) {
        placeTrainingOption(trainee, pair.opening);
        training.opening = pair.opening.shift.id;
        // Placing the opening's mentor can change who's free for the closing shift, so re-check.
        const closing = trainingOption(trainee, pair.closing.shift, 'closing', pair.mode);
        if (closing) {
          placeTrainingOption(trainee, closing);
          training.closing = closing.shift.id;
        }
      }
      for (const category of ['opening', 'closing'] as TrainingCategory[]) {
        if (!training[category]) {
          training[category] = placeSingleTraining(trainee, category)?.id;
        }
      }
      trainingShiftIdByUser.set(trainee.uid, training);

      if (training.opening && training.closing) {
        const ends = [training.opening, training.closing].map((id) => shiftById.get(id)?.end.getTime() ?? 0);
        trainingCompleteAtByUser.set(trainee.uid, Math.max(...ends));
      }
    }

    // Level-fills a pool of anchor slots: anchorOnly candidates first (see above), then mixed
    // candidates on whatever remains. Within each group, whoever currently has the fewest total
    // shifts goes first each round, so anchor duty is spread as evenly as tender duty.
    // For each pick, in order of priority:
    //   1. A slot nobody else could cover — getting an anchor on every shift beats balance.
    //   2. Whichever of opening/closing the person has fewer of (a preference, never a block
    //      unless mode is 'capped').
    //   3. The slot furthest from the person's other shifts, to spread them over the period.
    const fillAnchorSlotsFairly = (
      remaining: Map<string, Slot>,
      anchorOnlyUsers: User[],
      mixedUsers: User[],
      mode: AnchorCapMode
    ): void => {
      const allCandidates = [...anchorOnlyUsers, ...mixedUsers];
      const coverCount = (slot: Slot): number =>
        allCandidates.filter((user) => canTakeAnchorSlot(user, slot, mode)).length;

      const levelFillGroup = (candidates: User[]): void => {
        let progress = true;
        while (progress && remaining.size > 0) {
          progress = false;

          const slotList = Array.from(remaining.values());
          const eligible = candidates.filter((user) => slotList.some((slot) => canTakeAnchorSlot(user, slot, mode)));
          if (eligible.length === 0) {
            break;
          }

          const minCount = Math.min(...eligible.map((user) => totalAssignedCountByUser.get(user.uid) ?? 0));
          const tierUsers = shuffle(eligible.filter((user) => (totalAssignedCountByUser.get(user.uid) ?? 0) === minCount));

          for (const user of tierUsers) {
            const candidateSlots = Array.from(remaining.values()).filter((slot) => canTakeAnchorSlot(user, slot, mode));
            if (candidateSlots.length === 0) {
              continue;
            }

            const onlyCover = candidateSlots.filter((slot) => coverCount(slot) <= 1);
            const pool = onlyCover.length > 0 ? onlyCover : candidateSlots;

            const openingCandidates = pool.filter((slot) => slot.category === 'opening');
            const closingCandidates = pool.filter((slot) => slot.category === 'closing');

            let categoryPool: Slot[];
            if (openingCandidates.length > 0 && closingCandidates.length > 0) {
              const openingCount = totalOpeningCountByUser.get(user.uid) ?? 0;
              const closingCount = totalClosingCountByUser.get(user.uid) ?? 0;
              categoryPool =
                openingCount === closingCount
                  ? (Math.random() < 0.5 ? openingCandidates : closingCandidates)
                  : openingCount < closingCount
                  ? openingCandidates
                  : closingCandidates;
            } else if (openingCandidates.length > 0) {
              categoryPool = openingCandidates;
            } else if (closingCandidates.length > 0) {
              categoryPool = closingCandidates;
            } else {
              categoryPool = pool;
            }

            const [chosenSlot] = shuffle(categoryPool).sort(
              (a, b) => spreadScore(user.uid, b.shiftId) - spreadScore(user.uid, a.shiftId)
            );
            remaining.delete(chosenSlot.id);
            assignAnchor(user, chosenSlot);

            progress = true;
          }
        }
      };

      levelFillGroup(anchorOnlyUsers);
      levelFillGroup(mixedUsers);
    };

    // Phase 1: place anchors on the remaining non-mandatory shifts, with the caps first, then
    // without the opening/closing caps, then without any cap, for shifts still missing an anchor.
    fillAnchorSlotsFairly(remainingAnchorSlots, anchorOnlyCandidates, mixedAnchorCandidates, 'capped');
    fillAnchorSlotsFairly(remainingAnchorSlots, anchorOnlyCandidates, mixedAnchorCandidates, 'relaxed');
    // Last resort: an anchor over their total cap beats a shift with no anchor. Level-filling
    // still hands these extra shifts to whoever has the fewest shifts so far.
    fillAnchorSlotsFairly(remainingAnchorSlots, anchorOnlyCandidates, mixedAnchorCandidates, 'uncapped');

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

    // Phase 3: unified, level-filled non-mandatory tender assignment. Every remaining
    // non-mandatory tender slot, regardless of category, is considered together (fixes the old
    // opening-then-closing-then-middle phase order, which let one category exhaust the eligible
    // pool before the next was even considered). Each pass only offers slots to whoever
    // currently has the fewest total shifts among people who still have an eligible slot, and
    // whoever has fewer openings vs closings so far is steered toward whichever they need.
    const remainingTenderSlots = new Map<string, Slot>(tenderSlots.map((slot) => [slot.id, slot]));
    const regularUsers = activeUsers.filter((user) => !user.anchorOnly);
    const unmetMandatoryWarnings: Array<{ eventId: string; userId: string }> = [];

    const canTakeTenderSlot = (user: User, slot: Slot): boolean => {
      if (user.anchorOnly) {
        return false;
      }

      // Dynamic per-period cap instead of a fixed number — see perUserTotalCap above.
      if ((totalAssignedCountByUser.get(user.uid) ?? 0) >= perUserTotalCap) {
        return false;
      }

      // Dynamic per-period opening/closing caps (mandatory events excluded from the totals they're based on).
      if (slot.category === 'opening' && (assignedOpeningCountByUser.get(user.uid) ?? 0) >= perUserOpeningCap) {
        return false;
      }
      if (slot.category === 'closing' && (assignedClosingCountByUser.get(user.uid) ?? 0) >= perUserClosingCap) {
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

    const fillTenderSlotsFairly = (remaining: Map<string, Slot>): void => {
      let progress = true;
      while (progress && remaining.size > 0) {
        progress = false;

        const slotList = Array.from(remaining.values());
        const eligibleUsers = regularUsers.filter((user) =>
          slotList.some((slot) => canTakeTenderSlot(user, slot) && !hasAvoidConflictOnShift(user.uid, slot.shiftId))
        );
        if (eligibleUsers.length === 0) {
          break;
        }

        const minCount = Math.min(...eligibleUsers.map((user) => totalAssignedCountByUser.get(user.uid) ?? 0));
        const tierUsers = shuffle(eligibleUsers.filter((user) => (totalAssignedCountByUser.get(user.uid) ?? 0) === minCount));

        for (const user of tierUsers) {
          const candidates = Array.from(remaining.values()).filter(
            (slot) => canTakeTenderSlot(user, slot) && !hasAvoidConflictOnShift(user.uid, slot.shiftId)
          );
          if (candidates.length === 0) {
            continue;
          }

          const openingCandidates = candidates.filter((slot) => slot.category === 'opening');
          const closingCandidates = candidates.filter((slot) => slot.category === 'closing');

          let categoryPool: Slot[];
          if (openingCandidates.length > 0 && closingCandidates.length > 0) {
            const openingCount = assignedOpeningCountByUser.get(user.uid) ?? 0;
            const closingCount = assignedClosingCountByUser.get(user.uid) ?? 0;
            categoryPool =
              openingCount === closingCount
                ? (Math.random() < 0.5 ? openingCandidates : closingCandidates)
                : openingCount < closingCount
                ? openingCandidates
                : closingCandidates;
          } else if (openingCandidates.length > 0) {
            categoryPool = openingCandidates;
          } else if (closingCandidates.length > 0) {
            categoryPool = closingCandidates;
          } else {
            categoryPool = candidates;
          }

          // Within the chosen category, prefer the shift furthest from the person's other shifts
          // so theirs are spread over the whole period, then whichever shift currently has the
          // fewest people on it — otherwise slots would fill in the same fixed array order every
          // time, recreating the exact early-shift bias this replaces.
          const [chosenSlot] = shuffle(categoryPool).sort(
            (a, b) =>
              spreadScore(user.uid, b.shiftId) - spreadScore(user.uid, a.shiftId) ||
              (assignedUserIdsByShiftId.get(a.shiftId)?.size ?? 0) - (assignedUserIdsByShiftId.get(b.shiftId)?.size ?? 0)
          );

          remaining.delete(chosenSlot.id);
          onTenderSlotAssigned(user, chosenSlot);
          assignedTenderCountByUser.set(user.uid, (assignedTenderCountByUser.get(user.uid) ?? 0) + 1);
          if (chosenSlot.category === 'opening') {
            totalOpeningCountByUser.set(user.uid, (totalOpeningCountByUser.get(user.uid) ?? 0) + 1);
          } else if (chosenSlot.category === 'closing') {
            totalClosingCountByUser.set(user.uid, (totalClosingCountByUser.get(user.uid) ?? 0) + 1);
          }

          const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
          userEvents.add(chosenSlot.eventId);
          assignedEventsByUser.set(user.uid, userEvents);

          allAssignments.push({
            userId: user.uid,
            shiftId: chosenSlot.shiftId,
            eventId: chosenSlot.eventId,
            type: engagementType.TENDER,
          });
          plannedAssignments.push({
            userId: user.uid,
            shiftId: chosenSlot.shiftId,
            eventId: chosenSlot.eventId,
            type: engagementType.TENDER,
          });

          progress = true;
        }
      }
    };

    fillTenderSlotsFairly(remainingTenderSlots);

    // Phase 4: mandatory-event anchors, run after non-mandatory tenders so it's informed by the
    // full non-mandatory picture. Same anchorOnly-first-then-mixed leveled fill as Phase 1.
    const remainingMandatoryAnchorSlots = new Map<string, Slot>(mandatoryAnchorSlots.map((slot) => [slot.id, slot]));
    fillAnchorSlotsFairly(remainingMandatoryAnchorSlots, anchorOnlyCandidates, mixedAnchorCandidates, 'uncapped');

    // Phase 5: mandatory-event tenders. Everyone eligible and available is guaranteed a shift
    // regardless of load (no total-shift cap applies). Three ordered passes, each need-sorted:
    //   1. Middle shifts (the desirable ones) go first, to whoever already has the MOST
    //      opening+closing shifts so far — middle is the reward for people who've already
    //      shouldered the less desirable categories, not a leftover dumping ground.
    //   2. Opening and closing are then filled together, alternating one pick at a time between
    //      the "fewest openings so far" list and the "fewest closings so far" list, so neither
    //      list gets a first-mover advantage over the other.
    //   3. Anyone still unplaced (availability gaps meant a target above couldn't be reached)
    //      goes to whatever eligible shift is least loaded, any category.
    // Every pass spreads across a category's own shifts (main bar + satellite alike) by current
    // fill level, so no single shift gets overloaded while a sibling sits empty.
    const shiftWeight = (shift: Shift): number =>
      typeof shift.weight === 'number' && Number.isFinite(shift.weight) && shift.weight > 0 ? shift.weight : 1;

    const isEligibleForMandatoryShift = (user: User, shift: Shift): boolean =>
      anchorShiftIdsByUser.get(user.uid)?.has(shift.id) !== true &&
      assignedUserIdsByShiftId.get(shift.id)?.has(user.uid) !== true &&
      !hasAvoidConflictOnShift(user.uid, shift.id) &&
      effectiveAvailability(user.uid, shift.id);

    for (const mandatoryEventId of mandatoryEventIds) {
      const eventShifts = shifts.filter((shift) => shift.eventId === mandatoryEventId);
      if (eventShifts.length === 0) {
        continue;
      }

      const participants = regularUsers.filter(
        (user) => assignedEventsByUser.get(user.uid)?.has(mandatoryEventId) !== true
      );
      if (participants.length === 0) {
        continue;
      }

      const middleShifts = eventShifts.filter((shift) => categoryByShiftId.get(shift.id) === 'middle');
      const openingShifts = eventShifts.filter((shift) => categoryByShiftId.get(shift.id) === 'opening');
      const closingShifts = eventShifts.filter((shift) => categoryByShiftId.get(shift.id) === 'closing');

      // Each shift's share of the participants follows its weight (default 1, so equal weights
      // split everyone evenly, as before). Only people who can work some shift of the event count.
      const placeableCount = participants.filter((user) =>
        eventShifts.some((shift) => isEligibleForMandatoryShift(user, shift))
      ).length;
      const totalWeight = eventShifts.reduce((sum, shift) => sum + shiftWeight(shift), 0);
      const categoryTarget = (categoryShifts: Shift[]): number =>
        Math.ceil(
          (placeableCount * categoryShifts.reduce((sum, shift) => sum + shiftWeight(shift), 0)) / totalWeight
        );
      const middleTarget = categoryTarget(middleShifts);
      const openingTarget = categoryTarget(openingShifts);
      const closingTarget = categoryTarget(closingShifts);

      const assignedCountByShiftId = new Map<string, number>();
      for (const shift of eventShifts) {
        assignedCountByShiftId.set(shift.id, assignedUserIdsByShiftId.get(shift.id)?.size ?? 0);
      }

      // Shift each participant was placed on by this event's passes, so Pass 4 can move them.
      const placedShiftIdByUser = new Map<string, string>();

      const addToCategoryCount = (userId: string, shiftId: string, delta: number): void => {
        const category = categoryByShiftId.get(shiftId);
        if (category === 'opening') {
          totalOpeningCountByUser.set(userId, (totalOpeningCountByUser.get(userId) ?? 0) + delta);
        } else if (category === 'closing') {
          totalClosingCountByUser.set(userId, (totalClosingCountByUser.get(userId) ?? 0) + delta);
        }
      };

      const assignMandatoryTender = (user: User, shift: Shift): void => {
        placedShiftIdByUser.set(user.uid, shift.id);
        assignedCountByShiftId.set(shift.id, (assignedCountByShiftId.get(shift.id) ?? 0) + 1);
        markAssignedToShift(user.uid, shift.id);
        totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);
        assignedTenderCountByUser.set(user.uid, (assignedTenderCountByUser.get(user.uid) ?? 0) + 1);
        addToCategoryCount(user.uid, shift.id, 1);

        const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
        userEvents.add(mandatoryEventId);
        assignedEventsByUser.set(user.uid, userEvents);

        allAssignments.push({ userId: user.uid, shiftId: shift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
        plannedAssignments.push({ userId: user.uid, shiftId: shift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
      };

      // "Least loaded" relative to weight: a weight-2 shift counts as half as full as a weight-1
      // shift with the same headcount.
      const pickLeastLoaded = (candidateShifts: Shift[]): Shift => {
        const load = (shift: Shift): number => (assignedCountByShiftId.get(shift.id) ?? 0) / shiftWeight(shift);
        const [chosen] = shuffle(candidateShifts).sort((a, b) => load(a) - load(b));
        return chosen;
      };

      const isPlaced = (user: User): boolean => assignedEventsByUser.get(user.uid)?.has(mandatoryEventId) === true;

      // Pass 1: middle, to whoever has the most opening+closing shifts so far.
      const middleSorted = shuffle(participants).sort(
        (a, b) =>
          (totalOpeningCountByUser.get(b.uid) ?? 0) +
          (totalClosingCountByUser.get(b.uid) ?? 0) -
          ((totalOpeningCountByUser.get(a.uid) ?? 0) + (totalClosingCountByUser.get(a.uid) ?? 0))
      );
      let middleFilled = 0;
      for (const user of middleSorted) {
        if (middleFilled >= middleTarget) {
          break;
        }
        if (isPlaced(user)) {
          continue;
        }
        const eligible = middleShifts.filter((shift) => isEligibleForMandatoryShift(user, shift));
        if (eligible.length === 0) {
          continue;
        }
        assignMandatoryTender(user, pickLeastLoaded(eligible));
        middleFilled += 1;
      }

      // Pass 2: opening and closing, alternating one pick at a time between the two need-sorted
      // lists so neither category gets a first-mover advantage over the other.
      const openingSorted = shuffle(participants).sort(
        (a, b) => (totalOpeningCountByUser.get(a.uid) ?? 0) - (totalOpeningCountByUser.get(b.uid) ?? 0)
      );
      const closingSorted = shuffle(participants).sort(
        (a, b) => (totalClosingCountByUser.get(a.uid) ?? 0) - (totalClosingCountByUser.get(b.uid) ?? 0)
      );
      let openingIdx = 0;
      let closingIdx = 0;
      let openingFilled = 0;
      let closingFilled = 0;

      const tryFillNext = (
        sorted: User[],
        idx: number,
        target: number,
        filled: number,
        candidateShifts: Shift[]
      ): { idx: number; filled: number; placed: boolean } => {
        let cursor = idx;
        if (filled >= target) {
          return { idx: cursor, filled, placed: false };
        }
        while (cursor < sorted.length) {
          const user = sorted[cursor];
          cursor += 1;
          if (isPlaced(user)) {
            continue;
          }
          const eligible = candidateShifts.filter((shift) => isEligibleForMandatoryShift(user, shift));
          if (eligible.length === 0) {
            continue;
          }
          assignMandatoryTender(user, pickLeastLoaded(eligible));
          return { idx: cursor, filled: filled + 1, placed: true };
        }
        return { idx: cursor, filled, placed: false };
      };

      // Which side goes first is decided once per event (not per round) so opening doesn't get a
      // systematic head start over closing across every mandatory event.
      const openingFirst = Math.random() < 0.5;

      let progress = true;
      while (progress && (openingFilled < openingTarget || closingFilled < closingTarget)) {
        progress = false;

        const runOpening = (): void => {
          const openingResult = tryFillNext(openingSorted, openingIdx, openingTarget, openingFilled, openingShifts);
          openingIdx = openingResult.idx;
          if (openingResult.placed) {
            openingFilled = openingResult.filled;
            progress = true;
          }
        };
        const runClosing = (): void => {
          const closingResult = tryFillNext(closingSorted, closingIdx, closingTarget, closingFilled, closingShifts);
          closingIdx = closingResult.idx;
          if (closingResult.placed) {
            closingFilled = closingResult.filled;
            progress = true;
          }
        };

        if (openingFirst) {
          runOpening();
          runClosing();
        } else {
          runClosing();
          runOpening();
        }
      }

      // Pass 3: leftover fallback — anyone still unplaced goes to whatever eligible shift is
      // least loaded, any category. Only warn if they genuinely had no eligible shift at all.
      for (const user of shuffle(participants)) {
        if (isPlaced(user)) {
          continue;
        }
        const eligible = eventShifts.filter((shift) => isEligibleForMandatoryShift(user, shift));
        if (eligible.length === 0) {
          const couldWork = eventShifts.some((shift) => effectiveAvailability(user.uid, shift.id));
          if (couldWork) {
            unmetMandatoryWarnings.push({ eventId: mandatoryEventId, userId: user.uid });
          }
          continue;
        }
        assignMandatoryTender(user, pickLeastLoaded(eligible));
      }

      // Pass 4: rebalance by weight. The category passes fill up to rounded targets one after
      // another, so whichever category goes last absorbs any shortfall. Move people from the
      // fullest shift (headcount / weight) to a lighter one they can also work, as long as each
      // move makes the split closer to the weights.
      const countOn = (shift: Shift): number => assignedCountByShiftId.get(shift.id) ?? 0;
      const moveImproves = (from: Shift, to: Shift): boolean =>
        (2 * countOn(to) + 1) / shiftWeight(to) < (2 * countOn(from) - 1) / shiftWeight(from);

      const moveMandatoryTender = (user: User, from: Shift, to: Shift): void => {
        assignedCountByShiftId.set(from.id, countOn(from) - 1);
        assignedUserIdsByShiftId.get(from.id)?.delete(user.uid);
        addToCategoryCount(user.uid, from.id, -1);

        assignedCountByShiftId.set(to.id, countOn(to) + 1);
        markAssignedToShift(user.uid, to.id);
        addToCategoryCount(user.uid, to.id, 1);
        placedShiftIdByUser.set(user.uid, to.id);

        for (const list of [plannedAssignments, allAssignments]) {
          const record = list.find(
            (a) => a.userId === user.uid && a.shiftId === from.id && a.type === engagementType.TENDER
          );
          if (record) {
            record.shiftId = to.id;
          }
        }
      };

      const findRebalanceMove = (): { user: User; from: Shift; to: Shift } | undefined => {
        const byLoadDesc = shuffle(eventShifts).sort(
          (a, b) => countOn(b) / shiftWeight(b) - countOn(a) / shiftWeight(a)
        );
        for (const from of byLoadDesc) {
          for (const user of shuffle(participants.filter((p) => placedShiftIdByUser.get(p.uid) === from.id))) {
            const targets = eventShifts.filter(
              (to) => to.id !== from.id && moveImproves(from, to) && isEligibleForMandatoryShift(user, to)
            );
            if (targets.length > 0) {
              const [to] = shuffle(targets).sort(
                (a, b) => (countOn(a) + 1) / shiftWeight(a) - (countOn(b) + 1) / shiftWeight(b)
              );
              return { user, from, to };
            }
          }
        }
        return undefined;
      };

      // Every move strictly lowers sum(headcount² / weight), so this always terminates; the
      // bound is just a safety net.
      for (let moves = 0; moves < participants.length * eventShifts.length; moves += 1) {
        const move = findRebalanceMove();
        if (!move) {
          break;
        }
        moveMandatoryTender(move.user, move.from, move.to);
      }
    }

    for (const { eventId, userId } of unmetMandatoryWarnings) {
      warnings.push({
        code: 'mandatory_assignment_not_met',
        message: `${userById.get(userId)?.displayName ?? userId} indicated availability for a mandatory event but could not be assigned`,
        details: { userId, eventId },
      });
    }

    // Last safety net for anchor coverage: if a shift still has no anchor but someone who can
    // anchor was placed on it as a tender by this run, make them the anchor instead. Headcount
    // is unchanged, so it's always better than leaving the shift without an anchor.
    for (const shift of shifts) {
      if ((assignedAnchorsByShiftId.get(shift.id) ?? 0) > 0) {
        continue;
      }
      const promotable = shuffle(
        plannedAssignments.filter(
          (a) =>
            a.shiftId === shift.id &&
            a.type === engagementType.TENDER &&
            userById.get(a.userId) !== undefined &&
            canAnchorShift(userById.get(a.userId) as User, shift.id)
        )
      ).sort(
        (a, b) => (assignedAnchorCountByUser.get(a.userId) ?? 0) - (assignedAnchorCountByUser.get(b.userId) ?? 0)
      );
      const [promoted] = promotable;
      if (!promoted) {
        continue;
      }
      for (const list of [plannedAssignments, allAssignments]) {
        const record = list.find(
          (a) => a.userId === promoted.userId && a.shiftId === shift.id && a.type === engagementType.TENDER
        );
        if (record) {
          record.type = engagementType.ANCHOR;
        }
      }
      recordAnchorAssignment(promoted.userId, shift.id);
      assignedAnchorsByShiftId.set(shift.id, 1);
      assignedAnchorCountByUser.set(promoted.userId, (assignedAnchorCountByUser.get(promoted.userId) ?? 0) + 1);
      assignedTenderCountByUser.set(promoted.userId, Math.max(0, (assignedTenderCountByUser.get(promoted.userId) ?? 0) - 1));
    }

    // Training shifts should always have an experienced anchor next to the new anchor. Phase 1a
    // only ever places them that way, so this only fires if pre-existing data breaks it.
    for (const training of trainingShiftIdByUser.values()) {
      for (const shiftId of [training.opening, training.closing]) {
        const shift = shiftId ? shiftById.get(shiftId) : undefined;
        if (shift && !experiencedAnchorShiftIds.has(shift.id)) {
          warnings.push({
            code: 'shift_missing_experienced_anchor',
            message: `Shift "${shift.title}" has no experienced anchor assigned`,
            details: { shiftId: shift.id, eventId: shift.eventId },
          });
        }
      }
    }

    const assignedAnchorCount = plannedAssignments.filter((a) => a.type === engagementType.ANCHOR).length;
    const assignedTenderCount = plannedAssignments.filter((a) => a.type === engagementType.TENDER).length;

    for (const userId of newAnchorUserIds) {
      if (userById.get(userId)?.participationStatus !== 'active') {
        continue;
      }
      const training = trainingShiftIdByUser.get(userId) ?? {};
      const missingOpening = !training.opening;
      const missingClosing = !training.closing;

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
      previousStatus: period.status ?? 'open',
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
