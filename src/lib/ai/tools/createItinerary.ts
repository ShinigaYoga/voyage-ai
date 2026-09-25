import { ToolDefinition } from "./types";
import { generateItinerary } from "@/lib/itinerary/generator";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

export const createItineraryTool: ToolDefinition = {
  name: 'createItinerary',
  description: 'Generates a real, destination-aware day-by-day itinerary based on the current trip. Call this when the user asks for an itinerary or after creating a trip.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to generate itinerary for. Defaults to current trip.' },
      days: { type: 'number', description: 'Override number of days. If omitted, inferred from trip dates.' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip) return { result: { error: 'No trip found to generate itinerary for' } };

    const days = generateItinerary(trip, args.days);
    const itinerary = { days };

    // Compute budget from the generated activities
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);

    // Persist to server repository
    const updatedTrip = await ctx.tripRepository.upsert({
      ...trip,
      itinerary,
      budgetBreakdown,
    });

    ctx.currentTrip = updatedTrip;

    const totalActivities = days.reduce((sum, d) => sum + d.activities.length, 0);

    return {
      result: {
        itinerary,
        totalDays: days.length,
        totalActivities,
        budgetBreakdown,
        message: `Generated ${days.length}-day itinerary for ${trip.destination} with ${totalActivities} activities.`,
      },
      artifact: {
        type: 'itinerary',
        itinerary,
        tripId: updatedTrip.id,
        tripName: updatedTrip.name,
      },
    };
  },
};
