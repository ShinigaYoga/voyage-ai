import { ToolDefinition } from "./types";

export const updateTripTool: ToolDefinition = {
  name: 'updateTrip',
  description: 'Update parameters of an existing trip such as travelers count, duration/dates, budget, or destination.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to update' },
      destination: { type: 'string', description: 'Updated destination' },
      travelers: { type: 'number', description: 'Updated number of travelers' },
      dates: { type: 'string', description: 'Updated dates or duration (e.g. 5 days)' },
      budget: { type: 'number', description: 'Updated budget in INR' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    if (!id) {
      return { result: { error: "No trip context available to update" } };
    }

    const patch: any = {};
    const changes: string[] = [];

    if (args.destination) {
      patch.destination = args.destination;
      patch.name = `${args.destination} Expedition`;
      changes.push(`Destination changed to ${args.destination}`);
    }
    if (args.travelers !== undefined) {
      patch.travelers = args.travelers;
      changes.push(`Travelers updated to ${args.travelers}`);
    }
    if (args.dates) {
      patch.dates = args.dates;
      changes.push(`Duration/dates set to ${args.dates}`);
    }
    if (args.budget !== undefined) {
      patch.budget = `₹${Number(args.budget).toLocaleString('en-IN')}`;
      changes.push(`Budget updated to ${patch.budget}`);
    }

    const updatedTrip = await ctx.tripRepository.update(id, patch);

    return {
      result: { trip: updatedTrip, changes },
      artifact: { type: 'tripUpdated', changes, trip: updatedTrip },
    };
  },
};
