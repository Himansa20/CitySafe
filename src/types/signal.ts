import type { Timestamp } from "firebase/firestore";

export const CATEGORIES = [
  "waste",
  "safety",
  "transport",
  "flooding",
  "accessibility",
  "public_space",
] as const;

export const AFFECTED_GROUPS = [
  "women",
  "children",
  "elderly",
  "disabled",
  "low_income",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type AffectedGroup = (typeof AFFECTED_GROUPS)[number];

export type SignalStatus = "new" | "acknowledged" | "in_progress" | "resolved";

export type Signal = {
  id: string;

  category: Category;
  affectedGroups: AffectedGroup[];
  severity: number; // 1-5
  description: string;

  lat: number;
  lng: number;

  status: SignalStatus;

  hasLocalPhoto: boolean;

  confirmationsCount: number;
  priorityScore: number;

  eventTime: Timestamp;
  updatedAt?: Timestamp;

  // Phase 3
  statusUpdatedAt?: Timestamp;
  assignedOrg?: string;

  createdBy: string;
  createdAt: Timestamp;
};

export type NewSignalInput = {
  category: Category;
  affectedGroups: AffectedGroup[];
  severity: number;
  description: string;
  lat: number;
  lng: number;
  status: "new";
  hasLocalPhoto: boolean;
  createdBy: string;
};
