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
import type { NewSignalInput, Signal } from "../types/signal";

const signalsCol = collection(db, "signals");

export type SignalFilters = {
  category?: string | "all";
  status?: "new" | "all";
};

export function subscribeSignals(
  filters: SignalFilters,
  cb: (signals: Signal[]) => void,
  onError?: (err: unknown) => void
) {
  const constraints = [orderBy("createdAt", "desc")];

  if (filters.status && filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  } else {
    // Phase 1 UI shows status filter; keep default "new" in caller
  }

  if (filters.category && filters.category !== "all") {
    constraints.push(where("category", "==", filters.category));
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
  // Enforce Phase 1 invariants at client too
  if (input.status !== "new") throw new Error("Phase 1: status must be 'new'");
  const res = await addDoc(signalsCol, {
    ...input,
    createdAt: serverTimestamp(),
  });
  return res.id;
}
