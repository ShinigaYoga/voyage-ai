import { ToolDefinition } from "./types";
import { lastTransportSearchStore } from "./searchTransport";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

export const selectTransportTool: ToolDefinition = {
  name: "selectTransport",
  description: "Select a specific transport option for the trip and update the budget breakdown.",
  parameters: {
    type: "object",
    properties: {
      tripId: { type: "string", description: "The ID of the trip" },
      optionId: { type: "string", description: "The ID of the transport option selected" },
    },
    required: ["tripId", "optionId"],
  },
  execute: async (args: any) => {
    const serverRepo = new ServerTripRepository();
    let trip = await serverRepo.get(args.tripId);
    if (!trip) {
      const localRepo = new IndexedDbTripRepository();
      trip = await localRepo.get(args.tripId);
    }

    if (!trip) {
      return { result: { error: `Trip ${args.tripId} not found.` } };
    }

    const searchPool = lastTransportSearchStore[args.tripId] || [];
    const selected = searchPool.find(o => o.id === args.optionId);

    if (!selected) {
      return { result: { error: `Option ${args.optionId} not found. Perform a search first.` } };
    }

    const updatedTrip = {
      ...trip,
      transport: selected,
    };

    updatedTrip.budgetBreakdown = calculateBudgetBreakdown(updatedTrip);

    await serverRepo.upsert(updatedTrip);
    const localRepo = new IndexedDbTripRepository();
    await localRepo.upsert(updatedTrip);

    return {
      result: {
        success: true,
        selectedTransport: selected,
        trip: updatedTrip,
      },
      artifact: {
        type: 'tripUpdated',
        changes: [`Transport selected: ${selected.provider || selected.mode} (${selected.mode})`],
        trip: updatedTrip,
      }
    };
  },
};
