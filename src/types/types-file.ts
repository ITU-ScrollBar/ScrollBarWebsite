// User-related types
export interface UserProfile {
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
  abreviation: string;
  Prefix: string;
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

// Engagement-related types
export interface Engagement {
  id?: string;
  key?: string;
  shiftEnd: Date;
  userId?: string;
  upForGrabs: boolean;
  [key: string]: any;
}

// Event-related types
export interface Event {
  id: string;
  start: Date;
  end: Date;
  description: string;
  title: string;
  location: string;
  published: boolean;
  internal: boolean;
  [id: string]: any;
}

export interface FirebaseDate {
  seconds: number;
  nanoseconds: number;
}

export type EventCreateParams = {
  start: Date;
  end: Date;
  description: string;
  title: string;
  location: string;
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
  id?: string;
  key?: string;
  start: FirebaseDate;
  end: FirebaseDate;
  eventId: string;
  title: string;
  location: string;
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
  id: string;
  key: string;
  // Add any other fields you expect from Firestore, e.g.:
  name?: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  // Add other fields here
};

export type Invite = {
  id: string;
  key: string;
  email: string;
  // Other invite-related fields here
};

export type EngagementState = {
  loading: boolean;
  isLoaded: boolean;
  engagements: (Engagement & { key: string })[];
};
