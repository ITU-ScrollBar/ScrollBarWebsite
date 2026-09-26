import dayjs from "dayjs";
import type { Row, Sheet } from "write-excel-file/browser";
import { Engagement, engagementType, Event, Shift, ShiftPlanningPeriod, Tender } from "../../../../types/types-file";

export type ShiftPlanExportInput = {
  period: ShiftPlanningPeriod;
  events: Event[];
  shifts: Shift[];
  engagements: Engagement[];
  tenders: Tender[];
};

type AssignmentRow = {
  shift: Shift;
  event: Event | undefined;
  name: string;
  role: "Anchor" | "Tender";
};

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#e6eefb" } as const;

const header = (titles: string[]): Row => titles.map((value) => ({ value, ...HEADER_STYLE }));

// Dates as YYYY-MM-DD text: sorts correctly in Excel and avoids timezone shifts on Date cells.
const formatDate = (date: Date): string => dayjs(date).format("YYYY-MM-DD");
const formatDay = (date: Date): string => dayjs(date).format("ddd");
const formatTime = (date: Date): string => dayjs(date).format("HH:mm");

const categoryLabel = (shift: Shift): string =>
  shift.category ? shift.category.charAt(0).toUpperCase() + shift.category.slice(1) : "";

const eventTitle = (event: Event | undefined): string => event?.displayName || event?.title || "";

// Big parties (mandatory events) are staffed by weight instead of a fixed tender count.
const capacityLabel = (shift: Shift, mandatoryEventIds: Set<string>): string | number =>
  mandatoryEventIds.has(shift.eventId) ? `Big party, weight ${shift.weight ?? 1}` : shift.tenders;

const byStart = (a: Shift, b: Shift): number =>
  a.start.getTime() - b.start.getTime() || (a.linkedShiftId ? 1 : 0) - (b.linkedShiftId ? 1 : 0);

export const buildShiftPlanSheets = ({
  period,
  events,
  shifts,
  engagements,
  tenders,
}: ShiftPlanExportInput): Sheet<Blob>[] => {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const nameByUserId = new Map(tenders.map((tender) => [tender.uid, tender.displayName || tender.email || tender.uid]));
  const mandatoryEventIds = new Set(period.mandatoryEventIds ?? []);
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
  const allAssignments = sortedShifts.flatMap((shift) => assignmentsByShiftId.get(shift.id) ?? []);

  // Sheet 1: one row per shift, with who's on it.
  const shiftRows: Row[] = [
    header(["Date", "Day", "Start", "End", "Event", "Shift", "Category", "Location", "Capacity", "Anchors", "Tenders", "Headcount"]),
    ...sortedShifts.map((shift): Row => {
      const assigned = assignmentsByShiftId.get(shift.id) ?? [];
      const anchors = assigned.filter((a) => a.role === "Anchor").map((a) => a.name);
      const shiftTenders = assigned.filter((a) => a.role === "Tender").map((a) => a.name);
      return [
        formatDate(shift.start),
        formatDay(shift.start),
        formatTime(shift.start),
        formatTime(shift.end),
        eventTitle(eventById.get(shift.eventId)),
        shift.title,
        categoryLabel(shift),
        shift.location,
        capacityLabel(shift, mandatoryEventIds),
        { value: anchors.join("\n"), wrap: true },
        { value: shiftTenders.join("\n"), wrap: true },
        assigned.length,
      ];
    }),
  ];

  // Sheet 2: one row per person, with their counts and shift list.
  const assignmentsByName = new Map<string, AssignmentRow[]>();
  for (const assignment of allAssignments) {
    const list = assignmentsByName.get(assignment.name) ?? [];
    list.push(assignment);
    assignmentsByName.set(assignment.name, list);
  }
  const countCategory = (list: AssignmentRow[], category: Shift["category"]): number =>
    list.filter((a) => a.shift.category === category).length;
  const personRows: Row[] = [
    header(["Name", "Total", "Anchor shifts", "Tender shifts", "Opening", "Middle", "Closing", "Shifts"]),
    ...Array.from(assignmentsByName.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]): Row => [
        name,
        list.length,
        list.filter((a) => a.role === "Anchor").length,
        list.filter((a) => a.role === "Tender").length,
        countCategory(list, "opening"),
        countCategory(list, "middle"),
        countCategory(list, "closing"),
        {
          value: list
            .map((a) => `${formatDate(a.shift.start)} ${eventTitle(a.event)}: ${a.shift.title} (${a.role.toLowerCase()})`)
            .join("\n"),
          wrap: true,
        },
      ]),
  ];

  // Sheet 3: one row per assignment, for filtering and pivot tables.
  const assignmentRows: Row[] = [
    header(["Date", "Day", "Start", "End", "Event", "Shift", "Category", "Location", "Name", "Role"]),
    ...allAssignments.map((a): Row => [
      formatDate(a.shift.start),
      formatDay(a.shift.start),
      formatTime(a.shift.start),
      formatTime(a.shift.end),
      eventTitle(a.event),
      a.shift.title,
      categoryLabel(a.shift),
      a.shift.location,
      a.name,
      a.role,
    ]),
  ];

  return [
    {
      sheet: "Shifts",
      data: shiftRows,
      stickyRowsCount: 1,
      columns: [12, 6, 7, 7, 24, 22, 10, 14, 20, 24, 28, 10].map((width) => ({ width })),
    },
    {
      sheet: "People",
      data: personRows,
      stickyRowsCount: 1,
      columns: [24, 7, 13, 13, 9, 9, 9, 60].map((width) => ({ width })),
    },
    {
      sheet: "All assignments",
      data: assignmentRows,
      stickyRowsCount: 1,
      columns: [12, 6, 7, 7, 24, 22, 10, 14, 24, 9].map((width) => ({ width })),
    },
  ];
};

const toFileName = (periodName: string): string => {
  const slug = periodName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "period";
  return `shift-plan-${slug}.xlsx`;
};

// The Excel writer is loaded only when someone exports, so it stays out of the main bundle.
export const exportShiftPlanToExcel = async (input: ShiftPlanExportInput): Promise<void> => {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  await writeXlsxFile(buildShiftPlanSheets(input)).toFile(toFileName(input.period.name));
};
