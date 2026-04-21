import { Shift } from "../../../types/types-file";

export type ParticipationStatus = "active" | "passive" | "legacy" | "leave";
export type EventDecision = "can" | "partial" | "cannot" | "unanswered";
export type EventChoice = "can" | "cannot";
export type SurveyResponseSection = "overview" | "individual";
export type ResponseFilter =
  | "all"
  | "responded"
  | "missing"
  | "allAnchors"
  | "newAnchors"
  | "passiveMembers"
  | "legacyMembers"
  | "leavingBar";

export type EventAggregate = {
  eventId: string;
  title: string;
  start?: Date;
  canCount: number;
  partialCount: number;
  cannotCount: number;
  unansweredCount: number;
  shiftCounts: Array<{ shiftId: string; shiftTitle: string; canCount: number }>;
};

export type ShiftPlanningResponsesPageProps = {
  embedded?: boolean;
  embeddedSection?: SurveyResponseSection;
  selectedPeriodId?: string;
  onSelectedPeriodIdChange?: (periodId: string) => void;
};

export type SurveyUser = {
  uid: string;
  name: string;
  email?: string;
  responded: boolean;
};

export type CommentsRow = {
  key: string;
  userId: string;
  userName: string;
  participationStatus: ParticipationStatus;
  comments: string;
  submittedAt?: Date;
};

export type PeriodEventGroup = {
  eventId: string;
  event?: {
    id: string;
    title: string;
    start: Date;
  };
  shifts: Shift[];
};
