import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { engagementType, Role, Shift } from '../types/types-file';
import {
  User,
  ShiftCategory,
  Slot,
  assignSlotsRoundRobin,
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

    // Phase 1: place experienced anchors on non-mandatory shifts.
    const experiencedAnchors = anchorUsers.filter((user) => user.experiencedAnchor);
    // anchorOnly members have no tender fallback — their entire workload comes from anchor
    // duty, so they get priority access to the shared fair-share cap ahead of mixed anchors.
    const experiencedAnchorOnly = experiencedAnchors.filter((user) => user.anchorOnly);
    const experiencedAnchorMixed = experiencedAnchors.filter((user) => !user.anchorOnly);

    // applyCaps is true for Phase 1 (non-mandatory) and false for Phase 4 (mandatory) — mandatory
    // anchor duty is an add-on, guaranteed on top of non-mandatory scheduling, so it's never
    // blocked by the fair-share caps. It still steers toward whichever category someone's lower
    // on (see chosenSlot selection below), it just never refuses a slot because of it.
    const canTakeAnchorSlot = (user: User, slot: Slot, applyCaps: boolean): boolean => {
      if (!user.experiencedAnchor || !user.wantsAnchor || user.participationStatus !== 'active') {
        return false;
      }
      if (assignedUserIdsByShiftId.get(slot.shiftId)?.has(user.uid) === true) {
        return false;
      }
      // One shift per event, whether anchor or tender — without this, one experienced anchor
      // could be matched to two different shifts of the same event (e.g. its opening and
      // closing shift both needing an anchor).
      if (assignedEventsByUser.get(user.uid)?.has(slot.eventId) === true) {
        return false;
      }
      if (applyCaps) {
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

    // Level-fills a pool of anchor slots: anchorOnly candidates first (see above), then mixed
    // candidates on whatever remains. Within each group, whoever currently has the fewest total
    // shifts goes first each round, so anchor duty is spread as evenly as tender duty. When a
    // choice exists between an opening and closing slot, steers toward whichever category the
    // person currently has fewer of — same idea as the tender fill, just never a hard block when
    // applyCaps is false (mandatory).
    const fillAnchorSlotsFairly = (
      remaining: Map<string, Slot>,
      anchorOnlyUsers: User[],
      mixedUsers: User[],
      applyCaps: boolean
    ): void => {
      const levelFillGroup = (candidates: User[]): void => {
        let progress = true;
        while (progress && remaining.size > 0) {
          progress = false;

          const slotList = Array.from(remaining.values());
          const eligible = candidates.filter(
            (user) =>
              (!applyCaps || (totalAssignedCountByUser.get(user.uid) ?? 0) < perUserTotalCap) &&
              slotList.some(
                (slot) => canTakeAnchorSlot(user, slot, applyCaps) && !hasAvoidConflictOnShift(user.uid, slot.shiftId)
              )
          );
          if (eligible.length === 0) {
            break;
          }

          const minCount = Math.min(...eligible.map((user) => totalAssignedCountByUser.get(user.uid) ?? 0));
          const tierUsers = shuffle(eligible.filter((user) => (totalAssignedCountByUser.get(user.uid) ?? 0) === minCount));

          for (const user of tierUsers) {
            const candidateSlots = Array.from(remaining.values()).filter(
              (slot) => canTakeAnchorSlot(user, slot, applyCaps) && !hasAvoidConflictOnShift(user.uid, slot.shiftId)
            );
            if (candidateSlots.length === 0) {
              continue;
            }

            const openingCandidates = candidateSlots.filter((slot) => slot.category === 'opening');
            const closingCandidates = candidateSlots.filter((slot) => slot.category === 'closing');

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
              categoryPool = candidateSlots;
            }

            const [chosenSlot] = shuffle(categoryPool);
            remaining.delete(chosenSlot.id);

            allAssignments.push({
              userId: user.uid,
              shiftId: chosenSlot.shiftId,
              eventId: chosenSlot.eventId,
              type: engagementType.ANCHOR,
            });
            plannedAssignments.push({
              userId: user.uid,
              shiftId: chosenSlot.shiftId,
              eventId: chosenSlot.eventId,
              type: engagementType.ANCHOR,
            });

            markAssignedToShift(user.uid, chosenSlot.shiftId);
            recordAnchorAssignment(user.uid, chosenSlot.shiftId);
            assignedAnchorsByShiftId.set(chosenSlot.shiftId, (assignedAnchorsByShiftId.get(chosenSlot.shiftId) ?? 0) + 1);
            assignedAnchorCountByUser.set(user.uid, (assignedAnchorCountByUser.get(user.uid) ?? 0) + 1);
            totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);

            const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
            userEvents.add(chosenSlot.eventId);
            assignedEventsByUser.set(user.uid, userEvents);

            if (chosenSlot.category === 'opening') {
              totalOpeningCountByUser.set(user.uid, (totalOpeningCountByUser.get(user.uid) ?? 0) + 1);
            } else if (chosenSlot.category === 'closing') {
              totalClosingCountByUser.set(user.uid, (totalClosingCountByUser.get(user.uid) ?? 0) + 1);
            }
            if (!mandatoryEventIds.has(chosenSlot.eventId)) {
              if (chosenSlot.category === 'opening') {
                assignedOpeningCountByUser.set(user.uid, (assignedOpeningCountByUser.get(user.uid) ?? 0) + 1);
              } else if (chosenSlot.category === 'closing') {
                assignedClosingCountByUser.set(user.uid, (assignedClosingCountByUser.get(user.uid) ?? 0) + 1);
              }
            }

            progress = true;
          }
        }
      };

      levelFillGroup(anchorOnlyUsers);
      levelFillGroup(mixedUsers);
    };

    const remainingAnchorSlots = new Map<string, Slot>(anchorSlots.map((slot) => [slot.id, slot]));
    fillAnchorSlotsFairly(remainingAnchorSlots, experiencedAnchorOnly, experiencedAnchorMixed, true);

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
      recordAnchorAssignment(assignment.userId, assignment.shiftId);
      totalOpeningCountByUser.set(assignment.userId, (totalOpeningCountByUser.get(assignment.userId) ?? 0) + 1);
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
      recordAnchorAssignment(assignment.userId, assignment.shiftId);
      totalClosingCountByUser.set(assignment.userId, (totalClosingCountByUser.get(assignment.userId) ?? 0) + 1);
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

          // Spread within the chosen category by preferring whichever specific shift currently
          // has the fewest people on it — otherwise slots would fill in the same fixed array
          // order every time, recreating the exact early-shift bias this replaces.
          const [chosenSlot] = shuffle(categoryPool).sort(
            (a, b) =>
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
    fillAnchorSlotsFairly(remainingMandatoryAnchorSlots, experiencedAnchorOnly, experiencedAnchorMixed, false);

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

      const perShiftTarget = Math.max(1, Math.ceil(participants.length / eventShifts.length));
      const middleTarget = perShiftTarget * middleShifts.length;
      const openingTarget = perShiftTarget * openingShifts.length;
      const closingTarget = perShiftTarget * closingShifts.length;

      const assignedCountByShiftId = new Map<string, number>();
      for (const shift of eventShifts) {
        assignedCountByShiftId.set(shift.id, assignedUserIdsByShiftId.get(shift.id)?.size ?? 0);
      }

      const assignMandatoryTender = (user: User, shift: Shift): void => {
        assignedCountByShiftId.set(shift.id, (assignedCountByShiftId.get(shift.id) ?? 0) + 1);
        markAssignedToShift(user.uid, shift.id);
        totalAssignedCountByUser.set(user.uid, (totalAssignedCountByUser.get(user.uid) ?? 0) + 1);
        assignedTenderCountByUser.set(user.uid, (assignedTenderCountByUser.get(user.uid) ?? 0) + 1);

        const category = categoryByShiftId.get(shift.id);
        if (category === 'opening') {
          totalOpeningCountByUser.set(user.uid, (totalOpeningCountByUser.get(user.uid) ?? 0) + 1);
        } else if (category === 'closing') {
          totalClosingCountByUser.set(user.uid, (totalClosingCountByUser.get(user.uid) ?? 0) + 1);
        }

        const userEvents = assignedEventsByUser.get(user.uid) ?? new Set<string>();
        userEvents.add(mandatoryEventId);
        assignedEventsByUser.set(user.uid, userEvents);

        allAssignments.push({ userId: user.uid, shiftId: shift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
        plannedAssignments.push({ userId: user.uid, shiftId: shift.id, eventId: mandatoryEventId, type: engagementType.TENDER });
      };

      const pickLeastLoaded = (candidateShifts: Shift[]): Shift => {
        const [chosen] = shuffle(candidateShifts).sort(
          (a, b) => (assignedCountByShiftId.get(a.id) ?? 0) - (assignedCountByShiftId.get(b.id) ?? 0)
        );
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
    }

    for (const { eventId, userId } of unmetMandatoryWarnings) {
      warnings.push({
        code: 'mandatory_assignment_not_met',
        message: `${userById.get(userId)?.displayName ?? userId} indicated availability for a mandatory event but could not be assigned`,
        details: { userId, eventId },
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
