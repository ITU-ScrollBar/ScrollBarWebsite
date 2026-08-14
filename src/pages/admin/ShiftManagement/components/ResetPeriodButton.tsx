// Undoes a generated shift plan back to its pre-generation snapshot: deletes engagements
// created by that run, restores the period's prior status, and reverts role changes
// (new-anchor promotions, passive/legacy sync) so a later regenerate isn't corrupted by
// stale role state. Only ever shown once a period has actually been generated.
import { UndoOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import { useMemo } from "react";
import { useEngagementContext } from "../../../../contexts/EngagementContext";
import { useShiftContext } from "../../../../contexts/ShiftContext";
import useShiftPlanReset from "../../../../hooks/useShiftPlanReset";
import { ShiftPlanningPeriod } from "../../../../types/types-file";

type ResetPeriodButtonProps = {
  period: ShiftPlanningPeriod;
};

export default function ResetPeriodButton({ period }: ResetPeriodButtonProps) {
  const { shiftState } = useShiftContext();
  const { engagementState } = useEngagementContext();
  const { resetting, resetPeriod } = useShiftPlanReset();

  const periodEngagements = useMemo(() => {
    const periodShiftIds = new Set(
      shiftState.shifts.filter((shift) => period.eventIds.includes(shift.eventId)).map((shift) => shift.id)
    );
    return engagementState.engagements.filter((engagement) => periodShiftIds.has(engagement.shiftId));
  }, [engagementState.engagements, period.eventIds, shiftState.shifts]);

  if (period.status !== "generated") {
    return null;
  }

  return (
    <Popconfirm
      title="Reset period"
      description="Undo the generated shift plan for this period? This deletes the engagements it created, restores the period to its pre-generation state, and reverts role changes (new anchor promotions, passive/legacy sync) made during generation. Survey responses are not affected."
      onConfirm={() => resetPeriod({ period, periodEngagements })}
    >
      <Button danger icon={<UndoOutlined />} loading={resetting}>
        Reset period
      </Button>
    </Popconfirm>
  );
}
