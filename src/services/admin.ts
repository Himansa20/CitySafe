import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  onSnapshot,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ActionType, HelpRequestType, StatusUpdateInput, UserRole } from "../types/admin";
import type { Signal } from "../types/signal";

export function subscribePriorityQueue(
  cb: (signals: Signal[]) => void,
  onError?: (err: unknown) => void
) {
  // Sorted by priorityScore desc, limited for demo
  const q = query(collection(db, "signals"), orderBy("priorityScore", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Signal[];
      cb(items);
    },
    (err) => onError?.(err)
  );
}

export async function updateSignalStatus(signalId: string, input: StatusUpdateInput) {
  const ref = doc(db, "signals", signalId);
  await updateDoc(ref, {
    status: input.status,
    assignedOrg: input.assignedOrg ?? null,
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addActionLog(params: {
  signalId: string;
  createdBy: string;
  createdByRole: UserRole;
  orgName?: string | null;
  actionType: ActionType;
  note: string;
}) {
  await addDoc(collection(db, "actionLogs"), {
    signalId: params.signalId,
    createdBy: params.createdBy,
    createdByRole: params.createdByRole,
    orgName: params.orgName ?? null,
    actionType: params.actionType,
    note: params.note,
    createdAt: serverTimestamp(),
  });
}

export function subscribeActionLogsBySignal(
  signalId: string,
  cb: (logs: any[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(
    collection(db, "actionLogs"),
    where("signalId", "==", signalId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    (err) => onError?.(err)
  );
}

export async function createHelpRequest(params: {
  title: string;
  description: string;
  type: HelpRequestType;
  orgName: string;
  createdBy: string;
  signalId?: string | null;
  areaId?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  await addDoc(collection(db, "helpRequests"), {
    title: params.title,
    description: params.description,
    type: params.type,
    orgName: params.orgName,
    createdBy: params.createdBy,
    signalId: params.signalId ?? null,
    areaId: params.areaId ?? null,
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    neededBy: null,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function closeHelpRequest(helpRequestId: string) {
  await updateDoc(doc(db, "helpRequests", helpRequestId), {
    status: "closed",
  });
}

export function subscribeOpenHelpRequests(cb: (reqs: any[]) => void, onError?: (err: unknown) => void) {
  const q = query(collection(db, "helpRequests"), where("status", "==", "open"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    (err) => onError?.(err)
  );
}

export async function listSignalsLast7d(): Promise<Signal[]> {
  // Used for VPI compute client-side (simple)
  // NOTE: For demo, fetch latest 200 by eventTime desc; then filter in client.
  const q = query(collection(db, "signals"), orderBy("eventTime", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Signal[];
}
