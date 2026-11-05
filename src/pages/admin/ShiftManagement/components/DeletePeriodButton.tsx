import { DeleteOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Tooltip, message } from "antd";
import { useState } from "react";
import { useEventContext } from "../../../../contexts/EventContext";
import { useShiftPlanningContext } from "../../../../contexts/ShiftPlanningContext";
import { deleteShiftPlanningPeriod } from "../../../../firebase/api/shiftPlanning";
import { ShiftPlanningPeriod } from "../../../../types/types-file";

type DeletePeriodButtonProps = {
  period: ShiftPlanningPeriod;
};

export default function DeletePeriodButton({ period }: DeletePeriodButtonProps) {
  const { eventState } = useEventContext();
  const { setSelectedPeriodId } = useShiftPlanningContext();
  const [deleting, setDeleting] = useState(false);

  // A period runs from when its survey opens until its last event ends.
  const periodEventEnds = [...eventState.events, ...eventState.previousEvents]
    .filter((event) => period.eventIds.includes(event.id))
    .map((event) => event.end.getTime());
  const end = Math.max(period.submissionClosesAt.getTime(), ...periodEventEnds);
  const now = Date.now();
  const isActive = period.submissionOpensAt.getTime() <= now && now <= end;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteShiftPlanningPeriod(period.id);
      setSelectedPeriodId(undefined);
      message.success(`Deleted ${period.name}`);
    } catch (error) {
      message.error(`Failed to delete period: ${error instanceof Error ? error.message : "An unexpected error occurred."}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Popconfirm
      title="Delete period"
      description="Delete this period and all its survey responses? Events, shifts and engagements are kept. This can't be undone."
      onConfirm={handleDelete}
      disabled={isActive}
    >
      <Tooltip title={isActive ? "You can't delete a period while it's running." : undefined}>
        <Button danger icon={<DeleteOutlined />} loading={deleting} disabled={isActive}>
          Delete period
        </Button>
      </Tooltip>
    </Popconfirm>
  );
}
