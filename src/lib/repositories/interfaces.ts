import { Trip, Message, CreateMessageInput } from "../types";

export interface TripRepository {
  list(): Promise<Trip[]>;
  get(id: string): Promise<Trip | null>;
  create(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip>;
  update(id: string, patch: Partial<Trip>): Promise<Trip>;
  upsert(trip: Trip): Promise<Trip>;
  delete(id: string): Promise<void>;
}

export interface MessageRepository {
  listByTrip(tripId: string): Promise<Message[]>;
  create(message: CreateMessageInput): Promise<Message>;
}
