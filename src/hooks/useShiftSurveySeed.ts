// Standalone hook for the test-data "seed survey" feature — kept separate from
// useShiftPlanning.ts so the seed-only functionality is easy to find and remove.
import { message } from "antd";
import { useCallback, useState } from "react";
import {
  seedShiftSurveyResponses,
  SeedShiftSurveyResponsesResult,
} from "../firebase/api/shiftSurveySeed";
import { Shift, ShiftPlanningPeriod, Tender } from "../types/types-file";

const useShiftSurveySeed = () => {
  const [seeding, setSeeding] = useState(false);

  const seedSurveyResponses = useCallback(async (params: {
    period: ShiftPlanningPeriod;
    shifts: Shift[];
    tenders: Tender[];
    seed?: number;
  }): Promise<SeedShiftSurveyResponsesResult | null> => {
    setSeeding(true);
    try {
      const result = await seedShiftSurveyResponses(params);
      message.success(`Seeded ${result.seededCount} test survey response(s).`);
      return result;
    } catch (error) {
      message.error(
        `Failed to seed test survey responses: ${
          error instanceof Error ? error.message : "An unexpected error occurred."
        }`
      );
      return null;
    } finally {
      setSeeding(false);
    }
  }, []);

  return { seeding, seedSurveyResponses };
};

export default useShiftSurveySeed;
