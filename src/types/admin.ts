import type { Timestamp } from "firebase/firestore";
import type { SignalStatus } from "./signal";

export type UserRole = "citizen" | "ngo" | "admin";

export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  orgName?: string | null;
  createdAt: Timestamp;
};

export type ActionType =
  | "cleanup"
  | "lighting_request"
  | "patrol"
  | "repair"
  | "inspection"
  | "other";

export type ActionLog = {
  id: string;
  signalId: string;
  createdBy: string;
  createdByRole: UserRole;
  orgName?: string | null;
  actionType: ActionType;
  note: string;
  createdAt: Timestamp;
};

export type HelpRequestType = "volunteer" | "supplies" | "donation" | "other";
export type HelpRequestStatus = "open" | "closed";

export type HelpRequest = {
  id: string;
  title: string;
  description: string;
  type: HelpRequestType;
  areaId?: string | null;
  signalId?: string | null;
  lat?: number | null;
  lng?: number | null;
  neededBy?: Timestamp | null;
  createdBy: string;
  orgName: string;
  status: HelpRequestStatus;
  createdAt: Timestamp;
};

export type Pledge = {
  id: string; // `${helpRequestId}_${userId}`
  helpRequestId: string;
  userId: string;
  message?: string | null;
  createdAt: Timestamp;
};

export type StatusUpdateInput = {
  status: SignalStatus;
  assignedOrg?: string | null;
};
