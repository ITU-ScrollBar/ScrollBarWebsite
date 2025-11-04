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
  firstname: string;
  surname: string;
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
  hero: string;
  homepageTitle: string;
  homepageDescription: string;
  joinScrollBarLink: string;
  joinScrollBarText: string;
  joinScrollBarTitle: string;
  minutes: string;
  openForSignups: boolean;
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
}

export type Event = {
  published: boolean;
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

// Shift-related types
export interface Shift {
  id: string;
  eventId: string;
  location: string;
  title: string;
  tenders: number;
  anchors: number;
  start: Date;
  end: Date;
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
  displayName?: string;
  photoUrl?: string;
  isAdmin: boolean;
  roles?: string[];
  studyline?: string;
  teamIds?: string[];
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
