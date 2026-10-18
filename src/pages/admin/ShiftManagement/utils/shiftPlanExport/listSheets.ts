import type { Row, Sheet } from "write-excel-file/browser";
import { Shift } from "../../../../../types/types-file";
import {
  AssignmentRow,
  ShiftPlanData,
  categoryLabel,
  eventTitle,
  formatDate,
  formatDay,
  formatTime,
  headerRow,
} from "./shared";

// One row per person: their counts and the list of their shifts.
export const buildPeopleSheet = ({ allAssignments }: ShiftPlanData): Sheet<Blob> => {
  const assignmentsByName = new Map<string, AssignmentRow[]>();
  for (const assignment of allAssignments) {
    const list = assignmentsByName.get(assignment.name) ?? [];
    list.push(assignment);
    assignmentsByName.set(assignment.name, list);
  }
  const countCategory = (list: AssignmentRow[], category: Shift["category"]): number =>
    list.filter((a) => a.shift.category === category).length;

  const rows: Row[] = [
    headerRow(["Name", "Total", "Anchor shifts", "Tender shifts", "Opening", "Middle", "Closing", "Shifts"]),
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

  return {
    sheet: "People",
    data: rows,
    stickyRowsCount: 1,
    columns: [24, 7, 13, 13, 9, 9, 9, 60].map((width) => ({ width })),
  };
};

// One row per assignment, for filtering and pivot tables.
export const buildAssignmentsSheet = ({ allAssignments }: ShiftPlanData): Sheet<Blob> => {
  const rows: Row[] = [
    headerRow(["Date", "Day", "Start", "End", "Event", "Shift", "Category", "Location", "Name", "Role"]),
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

  return {
    sheet: "All assignments",
    data: rows,
    stickyRowsCount: 1,
    columns: [12, 6, 7, 7, 24, 22, 10, 14, 24, 9].map((width) => ({ width })),
  };
};
