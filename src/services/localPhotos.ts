import { openDB, type DBSchema } from "idb";

type PhotoRecord = {
  signalId: string;
  blob: Blob;
  createdAt: number;
};

interface CitySignalDB extends DBSchema {
  photos: {
    key: string; // signalId
    value: PhotoRecord;
  };
}

const DB_NAME = "citysignal-db";
const DB_VERSION = 1;

async function getDb() {
  return openDB<CitySignalDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "signalId" });
      }
    },
  });
}

export async function saveLocalPhoto(signalId: string, file: File): Promise<void> {
  const db = await getDb();
  const blob = file.slice(0, file.size, file.type);
  await db.put("photos", { signalId, blob, createdAt: Date.now() });
}

export async function loadLocalPhotoUrl(signalId: string): Promise<string | null> {
  const db = await getDb();
  const rec = await db.get("photos", signalId);
  if (!rec) return null;
  return URL.createObjectURL(rec.blob);
}

export async function deleteLocalPhoto(signalId: string): Promise<void> {
  const db = await getDb();
  await db.delete("photos", signalId);
}
