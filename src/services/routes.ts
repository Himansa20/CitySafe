// ... existing imports ...
import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { LatLng, BBox } from "../utils/geo";

export type RouteDoc = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: any;
};

export type SegmentDoc = {
  id: string;
  routeId: string;
  name?: string | null;
  polyline: LatLng[];
  bbox: BBox;
  createdAt: any;
};

export async function createRoute(params: { name: string; description: string; createdBy: string }) {
  const res = await addDoc(collection(db, "routes"), {
    name: params.name,
    description: params.description,
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
  });
  return res.id;
}

export async function deleteRoute(routeId: string) {
  await deleteDoc(doc(db, "routes", routeId));
}

export async function updateRoute(routeId: string, data: Partial<RouteDoc>) {
  await updateDoc(doc(db, "routes", routeId), data);
}

export function subscribeRoutes(cb: (routes: RouteDoc[]) => void, onError?: (e: unknown) => void) {
  const q = query(collection(db, "routes"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    (err) => onError?.(err)
  );
}

export async function createSegment(params: {
  routeId: string;
  name?: string | null;
  polyline: LatLng[];
  bbox?: BBox; // optional now to avoid build errors if not passed
}) {
  const segCol = collection(db, "routes", params.routeId, "segments");
  const res = await addDoc(segCol, {
    routeId: params.routeId,
    name: params.name ?? null,
    polyline: params.polyline,
    bbox: params.bbox ?? null,
    createdAt: serverTimestamp(),
  });
  return res.id;
}

// Alias for compatibility if needed, or just use createSegment
export const addSegmentToRoute = createSegment;

export function subscribeSegments(routeId: string, cb: (segs: SegmentDoc[]) => void, onError?: (e: unknown) => void) {
  const segCol = collection(db, "routes", routeId, "segments");
  const q = query(segCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    (err) => onError?.(err)
  );
}
