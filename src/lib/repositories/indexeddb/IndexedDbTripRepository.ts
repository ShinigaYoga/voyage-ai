import { TripRepository } from "../interfaces";
import { Trip } from "../../types";
import { getDB } from "./db";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export class IndexedDbTripRepository implements TripRepository {
  async list(): Promise<Trip[]> {
    const db = await getDB();
    if (!db) return [];
    const trips = await db.getAllFromIndex("trips", "by-updated");
    return trips.reverse(); // Newest first
  }

  async get(id: string): Promise<Trip | null> {
    const db = await getDB();
    if (!db) return null;
    return (await db.get("trips", id)) || null;
  }

  async create(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> {
    const db = await getDB();
    const now = Date.now();
    const newTrip: Trip = {
      ...trip,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    if (db) await db.put("trips", newTrip);
    return newTrip;
  }

  async update(id: string, patch: Partial<Trip>): Promise<Trip> {
    const db = await getDB();
    const trip = await this.get(id);

    if (!trip) {
      const fallbackTrip: Trip = {
        id,
        name: "Untitled trip",
        destination: "Unknown",
        travelers: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...patch,
      } as Trip;

      if (db) await db.put("trips", fallbackTrip);
      return fallbackTrip;
    }

    const updatedTrip: Trip = {
      ...trip,
      ...patch,
      updatedAt: Date.now(),
    };
    if (db) await db.put("trips", updatedTrip);
    return updatedTrip;
  }

  /** Create-or-update: safe to call even when trip doesn't exist locally yet */
  async upsert(trip: Trip): Promise<Trip> {
    const db = await getDB();
    const upserted: Trip = { ...trip, updatedAt: Date.now() };
    if (db) await db.put("trips", upserted);
    return upserted;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    if (db) await db.delete("trips", id);
  }
}
