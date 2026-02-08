import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export function subscribeHelpRequests(options: { status?: "open" | "closed" }, cb: (reqs: any[]) => void, onError?: (err: unknown) => void) {
  const constraints: any[] = [];
  if (options.status) constraints.push(where("status", "==", options.status));
  constraints.push(orderBy("createdAt", "desc"));
  const q = query(collection(db, "helpRequests"), ...constraints);
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    (err) => onError?.(err)
  );
}

function pledgeId(helpRequestId: string, userId: string) {
  return `${helpRequestId}_${userId}`;
}

export async function hasPledged(helpRequestId: string, userId: string): Promise<boolean> {
  const ref = doc(db, "pledges", pledgeId(helpRequestId, userId));
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function pledgeHelp(params: { helpRequestId: string; userId: string; message?: string }) {
  const ref = doc(db, "pledges", pledgeId(params.helpRequestId, params.userId));
  await setDoc(ref, {
    helpRequestId: params.helpRequestId,
    userId: params.userId,
    message: params.message ?? null,
    createdAt: serverTimestamp(),
  });
}
