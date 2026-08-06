// Standalone hook for "Reset period" — kept separate from useShiftPlanning.ts so this
// undo-only functionality is easy to find and remove.
import { message } from "antd";
import { useCallback, useState } from "react";
import { resetShiftPlanningPeriod } from "../firebase/api/shiftPlanReset";
import { Engagement, ShiftPlanningPeriod } from "../types/types-file";

const useShiftPlanReset = () => {
  const [resetting, setResetting] = useState(false);

  const resetPeriod = useCallback(async (params: {
    period: ShiftPlanningPeriod;
    periodEngagements: Engagement[];
  }) => {
    setResetting(true);
    try {
      const result = await resetShiftPlanningPeriod(params);
      message.success(
        `Reset complete: removed ${result.deletedEngagementCount} engagement(s), restored ${result.restoredRoleCount} role change(s).`
      );
      return result;
    } catch (error) {
      message.error(
        `Failed to reset period: ${error instanceof Error ? error.message : "An unexpected error occurred."}`
      );
      return null;
    } finally {
      setResetting(false);
    }
  }, []);

  return { resetting, resetPeriod };
};

export default useShiftPlanReset;
