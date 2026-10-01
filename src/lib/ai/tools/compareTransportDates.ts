import { ToolDefinition } from "./types";
import { getTransportService, scoreOptions } from "@/lib/services/transport";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

export const compareTransportDatesTool: ToolDefinition = {
  name: "compareTransportDates",
  description: "Compare estimated transport options across multiple future dates within a planning window (e.g. 2-6 months ahead).",
  parameters: {
    type: "object",
    properties: {
      tripId: { type: "string", description: "The ID of the trip" },
      origin: { type: "string", description: "Origin city" },
      destination: { type: "string", description: "Destination city" },
      dates: { 
        type: "array", 
        items: { type: "string" },
        description: "Array of future ISO dates to compare (e.g., ['2024-10-10', '2024-10-15', '2024-10-20'])"
      },
    },
    required: ["tripId", "dates"],
  },
  execute: async (args: any, ctx) => {
    const serverRepo = new ServerTripRepository();
    let trip = await serverRepo.get(args.tripId);
    if (!trip && ctx.currentTrip) {
      trip = ctx.currentTrip;
    }

    let origin = args.origin || trip?.name?.split(" to ")[0] || "Origin";
    const destination = args.destination || trip?.destination || "Destination";
    const dates: string[] = args.dates || [];

    if (dates.length === 0) {
      return { result: { error: "No dates provided for comparison." } };
    }

    const service = getTransportService();
    
    const comparisons: { date: string, options: any[] }[] = [];

    for (const date of dates) {
      const rawOptions = await service.search({
        origin,
        destination,
        date,
        passengers: trip?.travelers || 2,
      });

      const scored = scoreOptions(rawOptions, {});
      comparisons.push({
        date,
        options: scored
      });
    }

    // Determine cheapest across all dates for the summary
    let overallCheapest: any = null;
    let overallCheapestDate: string = "";

    for (const comp of comparisons) {
      const cheapestForDate = [...comp.options].sort((a, b) => a.price - b.price)[0];
      if (cheapestForDate) {
        if (!overallCheapest || cheapestForDate.price < overallCheapest.price) {
          overallCheapest = cheapestForDate;
          overallCheapestDate = comp.date;
        }
      }
    }

    return {
      result: {
        tripId: args.tripId,
        origin,
        destination,
        comparisonCount: comparisons.length,
        cheapestOverall: overallCheapest ? {
          date: overallCheapestDate,
          provider: overallCheapest.provider,
          price: overallCheapest.price,
          mode: overallCheapest.mode
        } : null,
      },
      // Emit a transport_comparison artifact to render the UI
      artifact: {
        type: "transport_comparison",
        tripId: args.tripId,
        comparisons,
        origin,
        destination,
      },
    };
  },
};
