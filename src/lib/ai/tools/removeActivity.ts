import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

export const removeActivityTool: ToolDefinition = {
  name: 'removeActivity',
  description: 'Removes an activity from the itinerary by its ID and recalculates the budget.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID' },
      activityId: { type: 'string', description: 'The activity ID to remove' },
    },
    required: ['activityId'],
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip || !trip.itinerary) return { result: { error: 'Trip or itinerary not found' } };

    let removed = false;
    const updatedDays = trip.itinerary.days.map(day => ({
      ...day,
      activities: day.activities.filter(act => {
        if (act.id === args.activityId) { removed = true; return false; }
        return true;
      }),
    }));

    if (!removed) return { result: { error: `Activity ${args.activityId} not found` } };

    const itinerary = { days: updatedDays };
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
    const updatedTrip = await ctx.tripRepository.upsert({ ...trip, itinerary, budgetBreakdown });
    ctx.currentTrip = updatedTrip;

    return {
      result: { success: true, message: 'Activity removed and budget recalculated.', budgetBreakdown },
    };
  },
};
