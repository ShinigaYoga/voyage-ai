import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

export const moveActivityTool: ToolDefinition = {
  name: 'moveActivity',
  description: 'Moves an activity from one day to another, optionally changing its start time. Recalculates budget.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID' },
      activityId: { type: 'string', description: 'The activity ID to move' },
      fromDay: { type: 'number', description: '0-based source day index' },
      toDay: { type: 'number', description: '0-based target day index' },
      newTime: { type: 'string', description: 'Optional new start time in "HH:MM" format' },
    },
    required: ['activityId', 'fromDay', 'toDay'],
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip || !trip.itinerary) return { result: { error: 'Trip or itinerary not found' } };

    let activityToMove = null as any;
    const days = trip.itinerary.days.map(day => ({ ...day, activities: [...day.activities] }));

    // Remove from source day
    const sourceDay = days[args.fromDay];
    if (sourceDay) {
      const idx = sourceDay.activities.findIndex((a: any) => a.id === args.activityId);
      if (idx !== -1) {
        activityToMove = { ...sourceDay.activities[idx] };
        sourceDay.activities.splice(idx, 1);
      }
    }

    if (!activityToMove) return { result: { error: `Activity ${args.activityId} not found in day ${args.fromDay}` } };

    if (args.newTime) activityToMove.startTime = args.newTime;

    // Insert into target day (sorted by start time)
    const targetDay = days[args.toDay];
    if (!targetDay) return { result: { error: `Target day ${args.toDay} not found` } };
    targetDay.activities.push(activityToMove);
    targetDay.activities.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

    const itinerary = { days };
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
    const updatedTrip = await ctx.tripRepository.upsert({ ...trip, itinerary, budgetBreakdown });
    ctx.currentTrip = updatedTrip;

    return {
      result: {
        success: true,
        message: `Activity moved from Day ${args.fromDay + 1} to Day ${args.toDay + 1}.`,
      },
    };
  },
};
