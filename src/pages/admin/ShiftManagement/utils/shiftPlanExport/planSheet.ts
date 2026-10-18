import dayjs from "dayjs";
import type { Cell, CellObject, Row, Sheet } from "write-excel-file/browser";
import { Event, Shift } from "../../../../../types/types-file";
import { ShiftPlanData, eventTitle } from "./shared";

// Mirrors the board's hand-made "Semester Shift Plan" sheet: one block per event, shifts side
// by side in columns B/D/F/H/J (C/E/G/I are narrow spacers), names listed under each shift with
// anchors first in bold.
const SLOT_COUNT = 5;
const SHIFT_COLUMN_WIDTHS = [31, 33, 32, 30.5, 27];
const LABEL_COLUMN_WIDTH = 36;
const SPACER_COLUMN_WIDTH = 11;

const GREY = "#7F7F7F";
const WHITE = "#FFFFFF";
const EVENT_FILL = "#E1E4DD";
const LOCATION_FILL = "#F8FF91";

const slotColumn = (slot: number): number => 1 + slot * 2;

const ordinal = (day: number): string => {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`;
};
const dateLabel = (date: Date): string => `${ordinal(date.getDate())} of ${dayjs(date).format("MMMM")}`;

const hourLabel = (date: Date): string => dayjs(date).format(date.getMinutes() === 0 ? "HH" : "HH:mm");

const shiftHeader = (shift: Shift, isBigParty: boolean): string => {
  const label = `${shift.title} (${hourLabel(shift.start)}-${hourLabel(shift.end)})`;
  return isBigParty ? label : `${label} - ${shift.tenders} people`;
};

const eventHeading = (event: Event | undefined, isBigParty: boolean): string => {
  const title = eventTitle(event);
  return isBigParty && !/^big party/i.test(title) ? `Big Party: ${title}` : title;
};

// A full-width row where every cell carries the same style and only column A has text.
const bandRow = (columnCount: number, text: string, style: CellObject): Row =>
  Array.from({ length: columnCount }, (_, index) => ({ ...style, ...(index === 0 ? { value: text } : {}) }));

const emptyRow = (columnCount: number): Row => Array.from({ length: columnCount }, (): Cell => null);

export const buildPlanSheet = (periodName: string, data: ShiftPlanData): Sheet<Blob> => {
  const { eventById, mandatoryEventIds, sortedShifts, assignmentsByShiftId } = data;

  const shiftsByEvent = new Map<string, Shift[]>();
  for (const shift of sortedShifts) {
    const list = shiftsByEvent.get(shift.eventId) ?? [];
    list.push(shift);
    shiftsByEvent.set(shift.eventId, list);
  }

  // Wider than five shifts per location is rare, but the sheet grows to fit instead of dropping any.
  const maxSlots = Math.max(
    SLOT_COUNT,
    ...Array.from(shiftsByEvent.values()).map((list) => list.filter((shift) => !shift.linkedShiftId).length)
  );
  const columnCount = slotColumn(maxSlots - 1) + 1;

  const rows: Row[] = [];

  const topHeader: Row = emptyRow(columnCount);
  const topStyle: CellObject = {
    fontWeight: "bold",
    fontSize: 14,
    textColor: WHITE,
    backgroundColor: GREY,
    align: "center",
    alignVertical: "center",
    height: 44,
  };
  topHeader[slotColumn(0)] = { ...topStyle, value: "OPENING", columnSpan: 3 };
  topHeader[slotColumn(2)] = { ...topStyle, value: "MIDDLE" };
  topHeader[slotColumn(3)] = { ...topStyle, value: "CLOSING", columnSpan: 3 };
  rows.push(topHeader);

  const eventIds = Array.from(shiftsByEvent.keys());
  for (const eventId of eventIds) {
    const eventShifts = shiftsByEvent.get(eventId) ?? [];
    const event = eventById.get(eventId);
    const isBigParty = mandatoryEventIds.has(eventId);

    rows.push(
      bandRow(columnCount, dateLabel(eventShifts[0].start), { fontWeight: "bold", fontSize: 14, backgroundColor: EVENT_FILL, height: 19 }),
      bandRow(columnCount, eventHeading(event, isBigParty), {
        fontWeight: "bold",
        fontSize: 18,
        backgroundColor: EVENT_FILL,
        alignVertical: "center",
        height: 28,
      }),
      bandRow(columnCount, "Bar Type:", { fontSize: 14, alignVertical: "center", height: 21 })
    );

    // Primary shifts are centered in the five columns (3 shifts land on D/F/H, as in the sheet).
    // Satellites go in the same column as the shift they belong to.
    const primaries = eventShifts.filter((shift) => !shift.linkedShiftId);
    const offset = Math.max(0, Math.floor((SLOT_COUNT - primaries.length) / 2));
    const slotByShiftId = new Map(primaries.map((shift, index) => [shift.id, offset + index]));

    const groups = new Map<string, Array<{ shift: Shift; slot: number }>>();
    groups.set("Main Bar", primaries.map((shift) => ({ shift, slot: slotByShiftId.get(shift.id) ?? 0 })));
    let nextFreeSlot = offset + primaries.length;
    for (const satellite of eventShifts.filter((shift) => shift.linkedShiftId)) {
      const label = satellite.location?.trim() || "Satellite";
      const slot = slotByShiftId.get(satellite.linkedShiftId ?? "") ?? Math.min(nextFreeSlot++, maxSlots - 1);
      groups.set(label, [...(groups.get(label) ?? []), { shift: satellite, slot }]);
    }

    let firstGroup = true;
    for (const [label, entries] of groups) {
      if (entries.length === 0) continue;
      if (!firstGroup) rows.push(emptyRow(columnCount));
      firstGroup = false;

      const locationStyle: CellObject = { fontWeight: "bold", fontSize: 14, backgroundColor: LOCATION_FILL, height: 30 };
      const locationRow = bandRow(columnCount, label, locationStyle);
      for (const { shift, slot } of entries) {
        locationRow[slotColumn(slot)] = { ...locationStyle, value: shiftHeader(shift, isBigParty) };
      }
      rows.push(locationRow);

      const namesBySlot = new Map(
        entries.map(({ shift, slot }) => [slot, assignmentsByShiftId.get(shift.id) ?? []] as const)
      );
      const depth = Math.max(0, ...Array.from(namesBySlot.values()).map((list) => list.length));
      for (let index = 0; index < depth; index += 1) {
        const nameRow = emptyRow(columnCount);
        for (const [slot, list] of namesBySlot) {
          const assignment = list[index];
          if (!assignment) continue;
          nameRow[slotColumn(slot)] = {
            value: assignment.name,
            fontSize: 13,
            height: 18,
            ...(assignment.role === "Anchor" ? { fontWeight: "bold" as const } : {}),
          };
        }
        rows.push(nameRow);
      }
    }

    rows.push(emptyRow(columnCount), emptyRow(columnCount));
  }

  const columns = Array.from({ length: columnCount }, (_, index) => {
    if (index === 0) return { width: LABEL_COLUMN_WIDTH };
    if (index % 2 === 0) return { width: SPACER_COLUMN_WIDTH };
    return { width: SHIFT_COLUMN_WIDTHS[(index - 1) / 2] ?? SHIFT_COLUMN_WIDTHS[SHIFT_COLUMN_WIDTHS.length - 1] };
  });

  return {
    // Excel sheet names are at most 31 characters and can't contain : \ / ? * [ ]
    sheet: periodName.replace(/[:\\/?*[\]]/g, "-").slice(0, 31) || "Shift plan",
    data: rows,
    stickyRowsCount: 1,
    columns,
  };
};
