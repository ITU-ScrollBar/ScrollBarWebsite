import dayjs from "dayjs";
import type { Row } from "write-excel-file/browser";
import { Engagement, engagementType, Event, Shift, ShiftPlanningPeriod, Tender } from "../../../../../types/types-file";

export type ShiftPlanExportInput = {
  period: ShiftPlanningPeriod;
  events: Event[];
  shifts: Shift[];
  engagements: Engagement[];
  tenders: Tender[];
};

export type AssignmentRow = {
  shift: Shift;
  event: Event | undefined;
  name: string;
  role: "Anchor" | "Tender";
};

export type ShiftPlanData = {
  eventById: Map<string, Event>;
  mandatoryEventIds: Set<string>;
  sortedShifts: Shift[];
  // Anchors first, then tenders, each alphabetical.
  assignmentsByShiftId: Map<string, AssignmentRow[]>;
  allAssignments: AssignmentRow[];
};

const byStart = (a: Shift, b: Shift): number =>
  a.start.getTime() - b.start.getTime() || (a.linkedShiftId ? 1 : 0) - (b.linkedShiftId ? 1 : 0);

export const collectShiftPlanData = ({ period, events, shifts, engagements, tenders }: ShiftPlanExportInput): ShiftPlanData => {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const nameByUserId = new Map(tenders.map((tender) => [tender.uid, tender.displayName || tender.email || tender.uid]));
  const sortedShifts = [...shifts].sort(byStart);
  const shiftById = new Map(sortedShifts.map((shift) => [shift.id, shift]));

  const assignmentsByShiftId = new Map<string, AssignmentRow[]>();
  for (const engagement of engagements) {
    const shift = shiftById.get(engagement.shiftId);
    if (!shift) continue;
    const list = assignmentsByShiftId.get(shift.id) ?? [];
    list.push({
      shift,
      event: eventById.get(shift.eventId),
      name: engagement.userId ? (nameByUserId.get(engagement.userId) ?? engagement.userId) : "(open)",
      role: engagement.type === engagementType.ANCHOR ? "Anchor" : "Tender",
    });
    assignmentsByShiftId.set(shift.id, list);
  }
  for (const list of assignmentsByShiftId.values()) {
    list.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  }

  return {
    eventById,
    mandatoryEventIds: new Set(period.mandatoryEventIds ?? []),
    sortedShifts,
    assignmentsByShiftId,
    allAssignments: sortedShifts.flatMap((shift) => assignmentsByShiftId.get(shift.id) ?? []),
  };
};

// Dates as YYYY-MM-DD text: sorts correctly in Excel and avoids timezone shifts on Date cells.
export const formatDate = (date: Date): string => dayjs(date).format("YYYY-MM-DD");
export const formatDay = (date: Date): string => dayjs(date).format("ddd");
export const formatTime = (date: Date): string => dayjs(date).format("HH:mm");

export const categoryLabel = (shift: Shift): string =>
  shift.category ? shift.category.charAt(0).toUpperCase() + shift.category.slice(1) : "";

export const eventTitle = (event: Event | undefined): string => event?.displayName || event?.title || "";

export const headerRow = (titles: string[]): Row =>
  titles.map((value) => ({ value, fontWeight: "bold", backgroundColor: "#e6eefb" }));
