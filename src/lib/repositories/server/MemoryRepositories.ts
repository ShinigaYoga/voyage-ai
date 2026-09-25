import { TripRepository, MessageRepository } from "../interfaces";
import { Trip, Message, CreateMessageInput } from "@/lib/types";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

const memoryTrips: Map<string, Trip> = new Map();
const memoryMessages: Map<string, Message[]> = new Map();

export class ServerTripRepository implements TripRepository {
  async list(): Promise<Trip[]> {
    return Array.from(memoryTrips.values());
  }

  async get(id: string): Promise<Trip | null> {
    return memoryTrips.get(id) || null;
  }

  async create(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> {
    const now = Date.now();
    const newTrip: Trip = {
      ...trip,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    memoryTrips.set(newTrip.id, newTrip);
    return newTrip;
  }

  async update(id: string, patch: Partial<Trip>): Promise<Trip> {
    const existing = memoryTrips.get(id);
    if (!existing) {
      // Create if missing
      const newTrip: Trip = {
        id,
        name: patch.name || "New Trip",
        destination: patch.destination || "Destination",
        travelers: patch.travelers || 1,
        budget: patch.budget,
        dates: patch.dates,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      memoryTrips.set(id, newTrip);
      return newTrip;
    }

    const updated: Trip = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };
    memoryTrips.set(id, updated);
    return updated;
  }

  async upsert(trip: Trip): Promise<Trip> {
    const upserted: Trip = { ...trip, updatedAt: Date.now() };
    memoryTrips.set(upserted.id, upserted);
    return upserted;
  }

  async delete(id: string): Promise<void> {
    memoryTrips.delete(id);
    memoryMessages.delete(id);
  }
}

export class ServerMessageRepository implements MessageRepository {
  async listByTrip(tripId: string): Promise<Message[]> {
    return memoryMessages.get(tripId) || [];
  }

  async create(message: CreateMessageInput): Promise<Message> {
    const newMessage = {
      ...message,
      id: generateId(),
      createdAt: Date.now(),
    } as Message;

    const tripId = message.tripId || "";
    const list = memoryMessages.get(tripId) || [];
    list.push(newMessage);
    memoryMessages.set(tripId, list);
    return newMessage;
  }
}
