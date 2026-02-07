import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NewSignalInput, Signal, Category } from "../types/signal";
import { computePriorityScore } from "../utils/scoring";
import type { TimeWindow } from "../utils/filters";
import { getThresholdDate } from "../utils/filters";
import { onSnapshot as onDocSnapshot } from "firebase/firestore";

const signalsCol = collection(db, "signals");

export type SignalQueryOptions = {
  timeWindow: TimeWindow;         // base query filter
  categories: Category[];         // optional server-side filter (== or in)
  status: "new" | "all";          // status is always "new" now but keep param
};

export function subscribeSignalsV2(
  options: SignalQueryOptions,
  cb: (signals: Signal[]) => void,
  onError?: (err: unknown) => void
) {
  const threshold = getThresholdDate(options.timeWindow);

  const constraints: any[] = [
    where("eventTime", ">=", threshold),
    orderBy("eventTime", "desc"),
  ];

  // Status: in Phase 2, signals are only "new" but keep it consistent
  if (options.status !== "all") {
    constraints.push(where("status", "==", options.status));
  }

  // Category filter: if 1 category, use ==. If 2..10, use in.
  // If 0 categories, no filter.
  if (options.categories.length === 1) {
    constraints.push(where("category", "==", options.categories[0]));
  } else if (options.categories.length >= 2 && options.categories.length <= 10) {
    constraints.push(where("category", "in", options.categories));
  }

  const q = query(signalsCol, ...constraints);

  return onSnapshot(
    q,
    (snap) => {
      const items: Signal[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Signal, "id">),
      }));
      cb(items);
    },
    (err) => onError?.(err)
  );
}

export async function getSignalById(id: string): Promise<Signal | null> {
  const ref = doc(db, "signals", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Signal, "id">) };
}

export async function createSignal(input: NewSignalInput): Promise<string> {
  if (input.status !== "new") throw new Error("Phase 2: status must be 'new'");

  const initialConfirmations = 0;
  const initialScore = computePriorityScore(input.severity, initialConfirmations, input.affectedGroups);

  const res = await addDoc(signalsCol, {
    ...input,
    confirmationsCount: 0,
    priorityScore: initialScore,
    eventTime: serverTimestamp(), // Phase 2: for now eventTime == creation time
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return res.id;
}

export function subscribeSignalById(
  id: string,
  cb: (signal: Signal | null) => void,
  onError?: (err: unknown) => void
) {
  const ref = doc(db, "signals", id);
  return onDocSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return cb(null);
      cb({ id: snap.id, ...(snap.data() as Omit<Signal, "id">) });
    },
    (err) => onError?.(err)
  );
}