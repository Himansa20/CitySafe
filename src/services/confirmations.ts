import {
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Signal } from "../types/signal";
import { computePriorityScore } from "../utils/scoring";

function confirmationDocId(signalId: string, userId: string) {
  return `${signalId}_${userId}`;
}

export async function hasConfirmed(signalId: string, userId: string): Promise<boolean> {
  const cRef = doc(db, "confirmations", confirmationDocId(signalId, userId));
  const snap = await getDoc(cRef);
  return snap.exists();
}

export async function confirmSignal(signalId: string, userId: string): Promise<{
  ok: boolean;
  alreadyConfirmed: boolean;
}> {
  const sRef = doc(db, "signals", signalId);
  const cRef = doc(db, "confirmations", confirmationDocId(signalId, userId));

  return runTransaction(db, async (tx) => {
    const [sSnap, cSnap] = await Promise.all([tx.get(sRef), tx.get(cRef)]);

    if (!sSnap.exists()) throw new Error("Signal not found.");
    if (cSnap.exists()) {
      return { ok: true, alreadyConfirmed: true };
    }

    const s = { id: sSnap.id, ...(sSnap.data() as Omit<Signal, "id">) };

    const current = typeof s.confirmationsCount === "number" ? s.confirmationsCount : 0;
    const nextCount = current + 1;
    const nextScore = computePriorityScore(s.severity, nextCount, s.affectedGroups);

    tx.set(cRef, {
      signalId,
      userId,
      createdAt: serverTimestamp(),
    });

    // Only update confirmation fields + updatedAt (rules will enforce strict field set)
    tx.update(sRef, {
      confirmationsCount: nextCount,
      priorityScore: nextScore,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, alreadyConfirmed: false };
  });
}
