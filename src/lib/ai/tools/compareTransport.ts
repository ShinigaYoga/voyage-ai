import { ToolDefinition } from "./types";
import { lastTransportSearchStore } from "./searchTransport";
import { TransportOption } from "@/lib/services/transport";

export const compareTransportTool: ToolDefinition = {
  name: "compareTransport",
  description: "Compare search results to calculate specific price differences in Rupees and duration differences in minutes.",
  parameters: {
    type: "object",
    properties: {
      tripId: { type: "string", description: "The ID of the trip" },
      optionIds: { type: "array", items: { type: "string" }, description: "Specific option IDs to compare" },
      mode: { type: "string", description: "Optional mode to filter comparison ('flight', 'train', 'bus')" },
    },
    required: ["tripId"],
  },
  execute: async (args: any) => {
    let options: TransportOption[] = lastTransportSearchStore[args.tripId] || [];

    if (args.mode) {
      options = options.filter(o => o.mode === args.mode);
    }
    if (args.optionIds && args.optionIds.length > 0) {
      options = options.filter(o => args.optionIds.includes(o.id));
    }

    if (options.length === 0) {
      return { result: { error: "No transport options available to compare. Call searchTransport first." } };
    }

    const sortedByPrice = [...options].sort((a, b) => a.price - b.price);
    const sortedByDuration = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes);

    const cheapest = sortedByPrice[0];
    const fastest = sortedByDuration[0];

    const priceDelta = Math.abs(fastest.price - cheapest.price);
    const timeDeltaMinutes = Math.abs(cheapest.durationMinutes - fastest.durationMinutes);
    const hours = Math.floor(timeDeltaMinutes / 60);
    const mins = timeDeltaMinutes % 60;
    const timeDeltaFormatted = `${hours}h ${mins}m`;

    return {
      result: {
        totalCompared: options.length,
        cheapest: {
          provider: cheapest.provider,
          mode: cheapest.mode,
          price: cheapest.price,
          durationMinutes: cheapest.durationMinutes,
        },
        fastest: {
          provider: fastest.provider,
          mode: fastest.mode,
          price: fastest.price,
          durationMinutes: fastest.durationMinutes,
        },
        priceDifferenceRupees: priceDelta,
        timeDifferenceMinutes: timeDeltaMinutes,
        timeDifferenceFormatted: timeDeltaFormatted,
        summary: `${fastest.provider} (${fastest.mode}) is faster by ${timeDeltaFormatted} but costs ₹${priceDelta} more than ${cheapest.provider} (${cheapest.mode}).`,
      },
      artifact: {
        type: "transport",
        tripId: args.tripId,
        options: options, // Send all options to the UI renderer
      },
    };
  },
};
