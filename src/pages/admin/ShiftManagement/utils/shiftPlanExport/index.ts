import type { Sheet } from "write-excel-file/browser";
import { buildAssignmentsSheet, buildPeopleSheet } from "./listSheets";
import { buildPlanSheet } from "./planSheet";
import { ShiftPlanExportInput, collectShiftPlanData } from "./shared";

export type { ShiftPlanExportInput } from "./shared";

export const buildShiftPlanSheets = (input: ShiftPlanExportInput): Sheet<Blob>[] => {
  const data = collectShiftPlanData(input);
  return [buildPlanSheet(input.period.name, data), buildPeopleSheet(data), buildAssignmentsSheet(data)];
};

const toFileName = (periodName: string): string => {
  const slug = periodName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "period";
  return `shift-plan-${slug}.xlsx`;
};

// The Excel writer is loaded only when someone exports, so it stays out of the main bundle.
export const exportShiftPlanToExcel = async (input: ShiftPlanExportInput): Promise<void> => {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  await writeXlsxFile(buildShiftPlanSheets(input), { fontFamily: "Aptos Narrow", fontSize: 12 }).toFile(
    toFileName(input.period.name)
  );
};
