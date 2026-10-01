import { TripRepository, MessageRepository } from "@/lib/repositories/interfaces";
import { Trip } from "@/lib/types";
import { AIProvider } from "@/lib/ai/providers/AIProvider";

export interface ToolContext {
  tripId?: string;
  tripRepository: TripRepository;
  messageRepository: MessageRepository;
  currentTrip?: Trip | null;
  aiProvider?: AIProvider;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any, ctx: ToolContext) => Promise<{
    result: any;
    artifact?: { type: "trip" | "itinerary" | "tripUpdated" | "transport" | "transport_comparison" | "unified_transport" | "hotel" | "restaurant" | "attraction" | "booking" | "weather"; [key: string]: any };
  }>;
}
