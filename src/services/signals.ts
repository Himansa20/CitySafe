import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
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

const signalsCol = collection(db, "signals");

export type SignalQueryOptions = {
  timeWindow: TimeWindow;
  categories: Category[];
  status: "new" | "all";
};

export async function listSignals(opts?: { limit?: number }): Promise<Signal[]> {
  const lim = opts?.limit ?? 500;
  const q = query(collection(db, "signals"), orderBy("eventTime", "desc"), limit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Signal[];
}

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

  if (options.status !== "all") {
    constraints.push(where("status", "==", options.status));
  }

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
  const initialScore = computePriorityScore(
    input.severity,
    initialConfirmations,
    input.affectedGroups
  );

  const res = await addDoc(signalsCol, {
    ...input,
    confirmationsCount: 0,
    priorityScore: initialScore,

    status: "new",
    assignedOrg: null,
    statusUpdatedAt: serverTimestamp(),

    eventTime: serverTimestamp(),
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
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return cb(null);
      cb({ id: snap.id, ...(snap.data() as Omit<Signal, "id">) });
    },
    (err) => onError?.(err)
  );
}
