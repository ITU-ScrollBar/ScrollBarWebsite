import { Role, Shift, ShiftPlanningPeriod, ShiftPlanningResponse, Tender } from '../types/types-file';
import { Dinic } from './maxflow';

export type ShiftCategory = 'opening' | 'closing' | 'middle' | 'other';

export type FirestoreDate =
  | Date
  | string
  | number
  | { seconds: number; nanoseconds?: number }
  | FirebaseFirestore.Timestamp;

export type PlanningPeriodDoc = Partial<
  Omit<ShiftPlanningPeriod, 'id' | 'submissionOpensAt' | 'submissionClosesAt'>
> & {
  submissionOpensAt?: FirestoreDate;
  submissionClosesAt?: FirestoreDate;
};

type ParticipationStatus = NonNullable<ShiftPlanningResponse['participationStatus']>;

export type ShiftPlanningResponseDoc = Partial<
  Omit<ShiftPlanningResponse, 'id' | 'availability' | 'submittedAt' | 'updatedAt'>
> & {
  availability?: Record<string, boolean>;
  submittedAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type User = Tender & {
  uid: string;
  roles: string[];
  participationStatus: ParticipationStatus;
  wantsAnchor: boolean;
  isAnchor: boolean;
  experiencedAnchor: boolean;
  anchorOnly: boolean;
};

export type Slot = {
  id: string;
  shiftId: string;
  eventId: string;
  category: ShiftCategory;
};

type TrackedEdge = {
  fromNode: string;
  edgeIndex: number;
  userId: string;
  slotId: string;
  eventId: string;
};

export type AssignRoundRobinParams = {
  slots: Slot[];
  users: User[];
  assignedEventsByUser: Map<string, Set<string>>;
  assignedCountByUser: Map<string, number>;
  canTake: (user: User, slot: Slot) => boolean;
  maxPerUser?: number;
  hasConflict?: (user: User, slot: Slot) => boolean;
  onAssigned?: (user: User, slot: Slot) => void;
};

export type AssignRoundRobinResult = {
  assignments: Array<{ userId: string; slotId: string; eventId: string; shiftId: string }>;
  unassignedSlotIds: string[];
};

export const toDate = (value: FirestoreDate | undefined): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof (value as FirebaseFirestore.Timestamp).toDate === 'function') {
    return (value as FirebaseFirestore.Timestamp).toDate();
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  return null;
};

const shuffle = <T>(input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
};

export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export const getShiftCategoryMap = (shifts: Shift[]): Map<string, ShiftCategory> => {
  const byEvent = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const existing = byEvent.get(shift.eventId) ?? [];
    existing.push(shift);
    byEvent.set(shift.eventId, existing);
  }

  const result = new Map<string, ShiftCategory>();
  for (const [, eventShifts] of byEvent) {
    const sorted = [...eventShifts].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let index = 0; index < sorted.length; index += 1) {
      const shift = sorted[index];
      if (index === 0) {
        result.set(shift.id, 'opening');
      } else if (index === sorted.length - 1) {
        result.set(shift.id, 'closing');
      } else {
        result.set(shift.id, 'middle');
      }
    }
  }
  return result;
};

export const hasRole = (user: Tender, role: Role): boolean => {
  return user.isAdmin || user.roles?.includes(role) === true;
};

export const isPlanningEligible = (user: Tender): boolean => {
  if (!user.active) {
    return false;
  }

  const roles = user.roles ?? [];
  if (roles.includes(Role.PASSIVE) || roles.includes(Role.LEGACY)) {
    return false;
  }

  return (
    user.isAdmin ||
    roles.includes(Role.TENDER) ||
    roles.includes(Role.ANCHOR) ||
    roles.includes(Role.REGULAR_ACCESS)
  );
};

export const isExpectedSurveyUser = (user: Tender): boolean => {
  if (!user.active) {
    return false;
  }

  const roles = user.roles ?? [];
  return roles.includes(Role.REGULAR_ACCESS);
};

export const getResponseAvailability = (
  responseMap: Map<string, ShiftPlanningResponseDoc>,
  userId: string,
  shiftId: string
): boolean => {
  const response = responseMap.get(userId);
  if (!response || !response.availability) {
    return false;
  }
  return response.availability[shiftId] === true;
};

export const assignSlotsRoundRobin = (params: AssignRoundRobinParams): AssignRoundRobinResult => {
  const {
    slots,
    users,
    assignedEventsByUser,
    assignedCountByUser,
    canTake,
    maxPerUser,
    hasConflict,
    onAssigned,
  } = params;

  const remainingSlots = new Map<string, Slot>();
  for (const slot of slots) {
    remainingSlots.set(slot.id, slot);
  }

  const assignments: Array<{ userId: string; slotId: string; eventId: string; shiftId: string }> = [];

  let progress = true;
  while (progress && remainingSlots.size > 0) {
    progress = false;

    const roundUsers = shuffle(users).filter((user) => {
      const currentCount = assignedCountByUser.get(user.uid) ?? 0;
      if (maxPerUser !== undefined && currentCount >= maxPerUser) {
        return false;
      }

      for (const slot of remainingSlots.values()) {
        if (assignedEventsByUser.get(user.uid)?.has(slot.eventId)) {
          continue;
        }
        if (hasConflict?.(user, slot) === true) {
          continue;
        }
        if (canTake(user, slot)) {
          return true;
        }
      }

      return false;
    });

    if (roundUsers.length === 0) {
      break;
    }

    const dinic = new Dinic();
    const source = 'source';
    const sink = 'sink';

    const trackedEdges: TrackedEdge[] = [];
    const sinkEdgesAdded = new Set<string>();

    for (const user of roundUsers) {
      const userNode = `u:${user.uid}`;
      dinic.addEdge(source, userNode, 1);

      const candidateByEvent = new Map<string, Slot[]>();
      for (const slot of remainingSlots.values()) {
        if (assignedEventsByUser.get(user.uid)?.has(slot.eventId)) {
          continue;
        }
        if (hasConflict?.(user, slot) === true) {
          continue;
        }
        if (!canTake(user, slot)) {
          continue;
        }

        const current = candidateByEvent.get(slot.eventId) ?? [];
        current.push(slot);
        candidateByEvent.set(slot.eventId, current);
      }

      for (const [eventId, eventSlots] of candidateByEvent) {
        const userEventNode = `ue:${user.uid}:${eventId}`;
        dinic.addEdge(userNode, userEventNode, 1);

        for (const slot of shuffle(eventSlots)) {
          const slotNode = `s:${slot.id}`;
          if (!sinkEdgesAdded.has(slot.id)) {
            dinic.addEdge(slotNode, sink, 1);
            sinkEdgesAdded.add(slot.id);
          }

          const edgeIndex = dinic.addEdge(userEventNode, slotNode, 1);
          trackedEdges.push({
            fromNode: userEventNode,
            edgeIndex,
            userId: user.uid,
            slotId: slot.id,
            eventId,
          });
        }
      }
    }

    if (trackedEdges.length === 0) {
      break;
    }

    dinic.maxFlow(source, sink);

    const usersAssignedThisRound = new Set<string>();
    const slotsAssignedThisRound = new Set<string>();

    for (const tracked of trackedEdges) {
      if (usersAssignedThisRound.has(tracked.userId) || slotsAssignedThisRound.has(tracked.slotId)) {
        continue;
      }

      const edge = dinic.getEdge(tracked.fromNode, tracked.edgeIndex);
      if (!edge || edge.cap !== 0) {
        continue;
      }

      const slot = remainingSlots.get(tracked.slotId);
      if (!slot) {
        continue;
      }

      const assignedUser = users.find((user) => user.uid === tracked.userId);
      if (!assignedUser) {
        continue;
      }

      if (hasConflict?.(assignedUser, slot) === true) {
        continue;
      }

      assignments.push({
        userId: tracked.userId,
        slotId: tracked.slotId,
        eventId: tracked.eventId,
        shiftId: slot.shiftId,
      });

      usersAssignedThisRound.add(tracked.userId);
      slotsAssignedThisRound.add(tracked.slotId);
      remainingSlots.delete(tracked.slotId);

      const userEvents = assignedEventsByUser.get(tracked.userId) ?? new Set<string>();
      userEvents.add(slot.eventId);
      assignedEventsByUser.set(tracked.userId, userEvents);

      const previous = assignedCountByUser.get(tracked.userId) ?? 0;
      assignedCountByUser.set(tracked.userId, previous + 1);

      onAssigned?.(assignedUser, slot);

      progress = true;
    }
  }

  return {
    assignments,
    unassignedSlotIds: Array.from(remainingSlots.keys()),
  };
};

