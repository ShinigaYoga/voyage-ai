import { ToolDefinition } from "./types";
import { getTransportService, scoreOptions, TransportOption } from "@/lib/services/transport";
import { IndexedDbUserRepository } from "@/lib/repositories/indexeddb/IndexedDbUserRepository";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

// In-memory cache for the last transport search result per trip
export const lastTransportSearchStore: Record<string, TransportOption[]> = {};

export const searchTransportTool: ToolDefinition = {
  name: "searchTransport",
  description: "Search available transport options (flights, trains, buses) between origin and destination.",
  parameters: {
    type: "object",
    properties: {
      tripId: { type: "string", description: "The ID of the trip" },
      origin: { type: "string", description: "Origin city (defaults to user home city or Delhi)" },
      destination: { type: "string", description: "Destination city (defaults to trip destination)" },
      date: { type: "string", description: "Travel date" },
      passengers: { type: "number", description: "Number of passengers" },
      preferredModes: {
        type: "array",
        items: { type: "string" },
        description: "Preferred transport modes ('flight', 'train', 'bus')",
      },
    },
    required: ["tripId"],
  },
  execute: async (args: any, ctx) => {
    const serverRepo = new ServerTripRepository();
    let trip = await serverRepo.get(args.tripId);
    // Fallback to context trip
    if (!trip && ctx.currentTrip) {
      trip = ctx.currentTrip;
    }

    let origin = args.origin;
    if (!origin) {
      // Server-side: cannot use IndexedDB; default to Delhi
      origin = "Delhi";
    }

    const destination = args.destination || trip?.destination || "Goa";
    const service = getTransportService();
    const rawOptions = await service.search({
      origin,
      destination,
      date: args.date || trip?.dates,
      passengers: args.passengers || trip?.travelers || 2,
      preferredModes: args.preferredModes,
    });

    const scored = scoreOptions(rawOptions, { preferredModes: args.preferredModes });
    lastTransportSearchStore[args.tripId] = scored;

    return {
      result: {
        tripId: args.tripId,
        origin,
        destination,
        optionsCount: scored.length,
        options: scored,
      },
      // Emit a transport artifact so the client renders the card UI
      artifact: {
        type: "transport",
        tripId: args.tripId,
        options: scored,
        origin,
        destination,
      },
    };
  },
};
