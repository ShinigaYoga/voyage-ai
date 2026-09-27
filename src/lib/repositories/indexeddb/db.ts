import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Trip, Message, UserProfile } from "../../types";

interface VoyageDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
    indexes: { "by-updated": number };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { "by-trip": string };
  };
  user_profile: {
    key: string;
    value: UserProfile;
  };
  weather_cache: {
    key: string;
    value: {
      id: string; // "lat_lon"
      timestamp: number;
      data: any;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VoyageDB>> | null = null;
let activeDB: IDBPDatabase<VoyageDB> | null = null;

function resetDBState() {
  if (activeDB) {
    try {
      activeDB.close();
    } catch {}
    activeDB = null;
  }
  dbPromise = null;
}

function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => reject(new Error("IndexedDB timeout")), ms);
      promise.finally(() => clearTimeout(timeoutId));
    }),
  ]);
}

async function openDatabase(): Promise<IDBPDatabase<VoyageDB>> {
  const db = await openDB<VoyageDB>("voyageai-db", 3, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        const tripStore = db.createObjectStore("trips", { keyPath: "id" });
        tripStore.createIndex("by-updated", "updatedAt");

        const msgStore = db.createObjectStore("messages", { keyPath: "id" });
        msgStore.createIndex("by-trip", "tripId");
      }
      if (oldVersion < 2) {
        db.createObjectStore("user_profile", { keyPath: "id" });
      }
      if (oldVersion < 3) {
        db.createObjectStore("weather_cache", { keyPath: "id" });
      }
    },
  });

  activeDB = db;
  db.onclose = () => {
    if (activeDB === db) {
      activeDB = null;
      dbPromise = null;
    }
  };

  return db;
}

export async function getDB() {
  if (typeof window === "undefined") {
    return null;
  }

  if (activeDB) {
    return activeDB;
  }

  if (!dbPromise) {
    dbPromise = openDatabase().catch((err) => {
      resetDBState();
      throw err;
    });
  }

  try {
    return await withTimeout(dbPromise, 5000);
  } catch (err) {
    console.warn("[IndexedDB] Connection timeout, retrying once", err);
    resetDBState();

    try {
      dbPromise = openDatabase().catch((retryErr) => {
        resetDBState();
        throw retryErr;
      });
      return await withTimeout(dbPromise, 5000);
    } catch (retryErr) {
      console.warn("[IndexedDB] Retry failed; falling back to null", retryErr);
      resetDBState();
      return null;
    }
  }
}
