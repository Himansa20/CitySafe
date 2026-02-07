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

export type SignalStatus = "new";

export type Signal = {
  id: string;

  category: Category;
  affectedGroups: AffectedGroup[];
  severity: number; // 1-5
  description: string;

  lat: number;
  lng: number;

  status: SignalStatus; // "new"

  // Phase 1 local photo metadata only
  hasLocalPhoto: boolean;

  // Phase 2
  confirmationsCount: number; // default 0
  priorityScore: number; // stored number
  eventTime: Timestamp; // use createdAt time for now, but stored separately
  updatedAt?: Timestamp;

  createdBy: string;
  createdAt: Timestamp;
};

// Input from UI form (Phase 1 fields only; service adds Phase 2 fields)
export type NewSignalInput = {
  category: Category;
  affectedGroups: AffectedGroup[];
  severity: number;
  description: string;
  lat: number;
  lng: number;
  status: SignalStatus; // "new"
  hasLocalPhoto: boolean;
  createdBy: string;
};
