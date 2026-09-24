
// User-related types
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  studyline: string;
  isAdmin: boolean;
  roles: string[];
  phone: string | null;
  active: boolean;
  photoUrl: string;
}

export interface StudyLine {
  id: string;
  name: string;
  abbreviation: string;
  prefix: string;
}

export interface UserForm {
  email: string;
  password: string;
  displayName: string;
  studyline: string;
}

export interface UserUpdateParams {
  id: string;
  field: string;
  value: any;
}

export interface InviteDeleteParams {
  id: string;
}

export interface PasswordResetParams {
  email: string;
}

// Settings-related types
export interface Settings {
  constitution: string;
  djdescription?: string;
  hero: string;
  homepageTitle: string;
  homepageDescription: string;
  getHelpTitle: string;
  getHelpDescription: string;
  joinScrollBarText: string;
  joinScrollBarTitle: string;
  inviteEmailBodyText?: string;
  rejectionEmailBodyText?: string;
  applicationSubmittedEmailBodyText?: string;
  minutes: string;
  openForSignupsStart?: string;
  openForSignupsEnd?: string;
}

export interface SettingsUpdateParams {
  field: string;
  value: any;
}

export enum engagementType {
  ANCHOR = "anchor",
  TENDER = "tender",
}

// Engagement-related types
export interface Engagement {
  id: string;
  type: engagementType;
  key: string;
  shiftId: string;
  shiftEnd: Date;
  userId?: string;
  upForGrabs: boolean;
  [key: string]: any;
}

// Event-related types
export interface BaseEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location: string;
  event_url?: string;
}

export type Event = {
  published: boolean;
  shiftsPublished: boolean;
  event_url?: string;
  photo_url?: string;
  [id: string]: any;
} & BaseEvent;

export interface FirebaseDate {
  seconds: number;
  nanoseconds: number;
}

export type EventCreateParams = {
  start: Date;
  end: Date;
  description: string;
  title: string;
  where: string;
  published: boolean;
  shiftsPublished: boolean;
  internal: boolean;
};

export interface EventUpdateParams {
  id: string;
  field: string;
  value: any;
}

export enum ShiftFiltering {
  MY_SHIFTS = "MY_SHIFTS",
  UP_FOR_GRABS = "UP_FOR_GRABS",
  ALL_SHIFTS = "ALL_SHIFTS",
}

export type ShiftCategory = "opening" | "middle" | "closing";

// Shift-related types
export interface Shift {
  id: string;
  eventId: string;
  location: string;
  title: string;
  tenders: number;
  start: Date;
  end: Date;
  category?: ShiftCategory;
  linkedShiftId?: string; // Set on satellite shifts; points to the primary shift's ID
}

export interface ShiftUpdateParams {
  id: string;
  field: string;
  value: any;
}

// Common types
export interface DocumentData {
  id: string;
  key: string;
  [key: string]: any;
}

// Define the types for the tenders and invited tenders
export type Tender = {
  uid: string;
  // Add any other fields you expect from Firestore, e.g.:
  name?: string;
  active: boolean;
  email: string;
  displayName: string;
  photoUrl?: string;
  isAdmin: boolean;
  roles?: string[];
  studyline?: string;
  teamIds?: string[];
  avoidShiftWithUserIds?: string[];
  lastCalendarDownload?: Date;
  // Add other fields here
};

export type Invite = {
  id: string;
  key: string;
  email: string;
  registered: boolean;
  // Other invite-related fields here
};

export type EngagementState = {
  loading: boolean;
  isLoaded: boolean;
  engagements: (Engagement & { key: string })[];
};

export enum Role {
  ADMIN = "admin",
  ANCHOR = "anchor",
  NEWBIE = "newbie",
  BOARD = "board",
  HR = "hr",
  TENDER_MANAGER = "tender_manager",
  SHIFT_MANAGER = "shift_manager",
  EVENT_MANAGER = "event_manager",
  REGULAR_ACCESS = "regular_access",
  PASSIVE = "passive",
  LEGACY = "legacy",
  TENDER = "tender",
}

export const scopeOptions = [Role.BOARD, Role.ANCHOR, Role.TENDER];

export type InternalEvent = {
  scope: string;
} & BaseEvent;

export type InternalEventCreateParams = {
  start: Date;
  end: Date;
  description?: string;
  title: string;
  location: string;
  scope: string;
};

export interface InternalEventUpdateParams {
  id: string;
  field: string;
  value: any;
}

export type Team = {
  id: string;
  name: string;
};

export type TeamCreateParams = {
  name: string;
};

export interface BoardRole {
  id: string;
  name: string;
  assignedUser?: Tender;
  sortingIndex?: number;
  contactEmail?: string;
}

export type ParticipationStatus = "active" | "passive" | "legacy" | "leave";
export type EventChoice = "can" | "cannot";
export type ShiftLoadPreference = "regular" | "max";

export type ShiftPlanningPeriodStatus =
  | "draft"
  | "open"
  | "closed"
  | "generated";

export type ShiftPlanningSurveyType =
  | "regularSemesterSurvey"
  | "excludeSemesterStatus"
  | "newbieShiftPlanning";

export interface ShiftPlanningPeriodSnapshot {
  status: ShiftPlanningPeriodStatus;
  engagementIds: string[];
  roleSnapshots: Array<{ userId: string; roles: string[] }>;
}

export interface ShiftPlanningPeriod {
  id: string;
  key?: string;
  name: string;
  eventIds: string[];
  mandatoryEventIds: string[];
  surveyType?: ShiftPlanningSurveyType;
  // Legacy field kept for older documents.
  includeShiftStatusQuestions?: boolean;
  submissionOpensAt: Date;
  submissionClosesAt: Date;
  status: ShiftPlanningPeriodStatus;
  createdBy: string;
  createdAt?: Date;
  generatedAt?: Date;
  generatedBy?: string;
  anchorSeminarDays?: string[];
  stats?: {
    expectedSubmissions?: number;
    submittedCount?: number;
    assignedAnchorCount?: number;
    assignedTenderCount?: number;
    unfilledAnchorSlots?: number;
    unfilledTenderSlots?: number;
  };
  // Captured right before the one-and-only generate run for this period, so "Reset period"
  // can undo it exactly — see functions/src/shiftPlanning/firebaseData.ts persistPlannerResult.
  preGenerationSnapshot?: ShiftPlanningPeriodSnapshot;
}

export interface ShiftPlanningResponse {
  id: string;
  key?: string;
  periodId: string;
  userId: string;
  participationStatus?: ParticipationStatus;
  wantsAnchor?: boolean;
  isNewAnchor?: boolean;
  availability?: Record<string, boolean>;
  anchorOnly?: boolean;
  anchorSeminarDays?: string[];
  shiftLoadPreference?: ShiftLoadPreference;
  comments?: string;
  passiveReason?: string;
  privateEmail?: string;
  submittedAt?: Date;
  updatedAt?: Date;
}

export type ApplicationDecision = "pending" | "maybe" | "accept" | "reject";

export type EmailDeliveryStatus = "pending" | "success" | "failed";

export enum TicketDepartment {
  MAINTENANCE = "maintenance",
  IT = "it",
}

export enum TicketRequestType {
  NEW_REQUEST = "new_request",
  BROKEN = "broken",
}

export enum TicketImpact {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export type TicketStatus = "open" | "in_progress" | "resolved";

export interface Ticket {
  id: string;
  key?: string;
  title: string;
  description: string;
  imageUrls?: string[];
  imagePaths?: string[];
  department: TicketDepartment;
  requestType: TicketRequestType;
  impact: TicketImpact;
  status: TicketStatus;
  // Firestore stores a DocumentReference to the creator; the list endpoint flattens it to
  // the user's uid, which is what reaches the client.
  createdByUid?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketCreateParams {
  title: string;
  description: string;
  imageUrls?: string[];
  imagePaths?: string[];
  department: TicketDepartment;
  requestType: TicketRequestType;
  impact: TicketImpact;
}

export interface IntakeApplication {
  id: string;
  fullName: string;
  email: string;
  studyline: string;
  comment: string;
  applicationFilePath: string;
  photoPath: string;
  decision: ApplicationDecision;
  emailDeliveryStatus: EmailDeliveryStatus;
  createdAt?: Date;
}

// Equipment lending and anonymous feedback: the two Microsoft Forms surveys that were replaced by
// on-site forms. Their responses live outside the ticket kanban, on the Form Responses page.
export enum LendingEquipment {
  SOUNDBOKS = "soundboks",
  SPEAKER_STAND = "speaker_stand",
  ICE_BUCKET = "ice_bucket",
  IPAD = "ipad",
  OTHER = "other",
}

export type LendingRequestStatus = "pending" | "approved" | "declined";

// Lending needs sign-off from two different board members, so approvals are tracked per uid and
// the status is derived from how many are registered.
export const LENDING_REQUIRED_APPROVALS = 2;

export type LendingDecision = "approve" | "withdraw" | "decline" | "reopen";

export interface FormComment {
  id: string;
  body: string;
  authorUid?: string;
  createdAt?: Date;
}

export interface LendingRequest {
  id: string;
  key?: string;
  equipment: LendingEquipment;
  // Free text for LendingEquipment.OTHER.
  equipmentDetails?: string;
  occasion: string;
  pickupAt?: Date;
  returnAt?: Date;
  responsibilityAccepted: boolean;
  additionalInfo?: string;
  status: LendingRequestStatus;
  approvedByUids: string[];
  declinedByUid?: string;
  // Firestore stores a DocumentReference to the creator; the list endpoint flattens it to the
  // user's uid, which is what reaches the client.
  createdByUid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  comments: FormComment[];
}

export interface LendingRequestCreateParams {
  equipment: LendingEquipment;
  equipmentDetails?: string;
  occasion: string;
  pickupAt: Date;
  returnAt: Date;
  responsibilityAccepted: boolean;
  additionalInfo?: string;
}

export interface AnonymousFeedback {
  id: string;
  key?: string;
  feedback: string;
  createdAt?: Date;
  updatedAt?: Date;
  comments: FormComment[];
}

export interface AnonymousFeedbackCreateParams {
  feedback: string;
}
