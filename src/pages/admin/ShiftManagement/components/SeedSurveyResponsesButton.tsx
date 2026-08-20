// Test-data button for the shift-plan feature: fills in randomized-but-valid survey
// responses for every eligible tender so the planner can be exercised end-to-end.
// Runs entirely client-side via the Firestore client SDK — Firestore security rules are
// the real enforcement boundary, not this button. Hidden outside dev as a convenience.
import { ExperimentOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import { useMemo } from "react";
import { useShiftContext } from "../../../../contexts/ShiftContext";
import { isShiftSurveySeedingEnabled } from "../../../../firebase/api/shiftSurveySeed";
import useShiftSurveySeed from "../../../../hooks/useShiftSurveySeed";
import { useTenderContext } from "../../../../contexts/TenderContext";
import { ShiftPlanningPeriod } from "../../../../types/types-file";

type SeedSurveyResponsesButtonProps = {
  period: ShiftPlanningPeriod;
};

export default function SeedSurveyResponsesButton({ period }: SeedSurveyResponsesButtonProps) {
  const { shiftState } = useShiftContext();
  const { tenderState } = useTenderContext();
  const { seeding, seedSurveyResponses } = useShiftSurveySeed();

  const periodShifts = useMemo(() => {
    const periodEventIds = new Set(period.eventIds);
    return shiftState.shifts.filter((shift) => periodEventIds.has(shift.eventId));
  }, [period.eventIds, shiftState.shifts]);

  if (!isShiftSurveySeedingEnabled) {
    return null;
  }

  return (
    <Popconfirm
      title="Seed test survey responses"
      description="Fill in randomized availability/anchor answers for every eligible tender in this period, overwriting any existing responses for those users? Only for testing the planner."
      onConfirm={() =>
        seedSurveyResponses({
          period,
          shifts: periodShifts,
          tenders: tenderState.tenders,
        })
      }
    >
      <Button icon={<ExperimentOutlined />} loading={seeding}>
        Seed test survey responses
      </Button>
    </Popconfirm>
  );
}
