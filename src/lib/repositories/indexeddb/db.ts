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

function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("IndexedDB timeout")), ms)
    ),
  ]);
}

export async function getDB() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<VoyageDB>("voyageai-db", 3, {
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
  }
  try {
    return await withTimeout(dbPromise, 3000);
  } catch (err) {
    console.warn("[IndexedDB] Connection timeout, falling back to null", err);
    return null;
  }
}
