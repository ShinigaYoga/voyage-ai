import { TripRepository, MessageRepository } from "@/lib/repositories/interfaces";
import { Trip } from "@/lib/types";

export interface ToolContext {
  tripId?: string;
  tripRepository: TripRepository;
  messageRepository: MessageRepository;
  currentTrip?: Trip | null;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any, ctx: ToolContext) => Promise<{
    result: any;
    artifact?: { type: "trip" | "itinerary" | "tripUpdated" | "transport" | "hotel" | "restaurant" | "attraction" | "booking" | "weather"; [key: string]: any };
  }>;
}
