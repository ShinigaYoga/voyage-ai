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
    const destination = typeof args?.destination === 'string' ? args.destination.trim() : '';
    if (!destination) {
      throw new Error('Trip destination is required.');
    }

    const startDate = typeof args?.startDate === 'string' && args.startDate.trim() ? args.startDate.trim() : undefined;
    const endDate = typeof args?.endDate === 'string' && args.endDate.trim() ? args.endDate.trim() : undefined;
    const travelers = Number(args?.travelers ?? 1);
    const budgetValue = args?.budget == null || args.budget === '' ? undefined : Number(args.budget);
    const budgetStr = Number.isFinite(budgetValue) && budgetValue !== undefined ? `₹${budgetValue.toLocaleString('en-IN')}` : undefined;
    const datesStr = startDate ? (endDate ? `${startDate} - ${endDate}` : startDate) : 'Dates TBD';

    const newTrip = await ctx.tripRepository.create({
      name: `${destination} Expedition`,
      destination,
      travelers: Number.isFinite(travelers) && travelers > 0 ? travelers : 1,
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
