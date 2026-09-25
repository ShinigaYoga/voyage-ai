import { ToolDefinition } from "./types";

export const createTripTool: ToolDefinition = {
  name: 'createTrip',
  description: 'Create a new trip. Call this when the user describes a destination, dates, travelers, or budget.',
  parameters: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'City or region name' },
      startDate: { type: 'string', description: 'ISO date or duration description, optional' },
      endDate: { type: 'string', description: 'ISO date, optional' },
      travelers: { type: 'number', description: 'Number of travelers' },
      budget: { type: 'number', description: 'Budget in INR, optional' },
      preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Free-form interests like beaches, food, nightlife, mountains',
      },
    },
    required: ['destination'],
  },
  execute: async (args, ctx) => {
    const name = `${args.destination} Expedition`;
    const budgetStr = args.budget ? `₹${Number(args.budget).toLocaleString('en-IN')}` : undefined;
    const datesStr = args.startDate ? (args.endDate ? `${args.startDate} - ${args.endDate}` : args.startDate) : "Dates TBD";

    const newTrip = await ctx.tripRepository.create({
      name,
      destination: args.destination,
      travelers: args.travelers || 1,
      budget: budgetStr,
      dates: datesStr,
    });

    // Update current context trip ID
    ctx.tripId = newTrip.id;
    ctx.currentTrip = newTrip;

    return {
      result: { trip: newTrip, success: true },
      artifact: { type: "trip", trip: newTrip },
    };
  },
};
