import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile, UserRole } from "../types/admin";

export async function getOrCreateUser(): Promise<UserProfile> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");

  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid: snap.id, ...(snap.data() as Omit<UserProfile, "uid">) };
  }

  const profile: Omit<UserProfile, "uid"> = {
    displayName: u.displayName ?? null,
    email: u.email ?? null,
    role: "citizen",
    orgName: null,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(ref, profile, { merge: true });

  const snap2 = await getDoc(ref);
  return { uid: snap2.id, ...(snap2.data() as Omit<UserProfile, "uid">) };
}

export async function getUserRole(uid: string): Promise<UserRole> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "citizen";
  return (snap.data() as any).role ?? "citizen";
}
