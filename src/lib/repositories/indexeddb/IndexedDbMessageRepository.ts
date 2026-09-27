import { MessageRepository } from "../interfaces";
import { Message, CreateMessageInput } from "../../types";
import { getDB } from "./db";
import { IndexedDbTripRepository } from "./IndexedDbTripRepository";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export class IndexedDbMessageRepository implements MessageRepository {
  async listByTrip(tripId: string): Promise<Message[]> {
    const db = await getDB();
    if (!db) return [];
    
    // get all from index and filter/sort
    const messages = await db.getAllFromIndex("messages", "by-trip", tripId);
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  }

  async create(message: CreateMessageInput): Promise<Message> {
    const db = await getDB();
    const newMessage = {
      ...message,
      id: generateId(),
      createdAt: Date.now(),
    } as Message;
    
    if (db) {
      await db.put("messages", newMessage);
      
      if (message.tripId) {
        const tripRepo = new IndexedDbTripRepository();
        try {
          await tripRepo.update(message.tripId, {});
        } catch (e) {
          console.error("Failed to update trip timestamp", e);
        }
      }
    }
    return newMessage;
  }
}
