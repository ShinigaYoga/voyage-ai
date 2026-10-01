import { ToolDefinition } from "./types";
import { generateItinerary } from "@/lib/itinerary/generator";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

export const regenerateDayTool: ToolDefinition = {
  name: 'regenerateDay',
  description: 'Regenerates a single day\'s activities. Use when the user says "make Day 3 cheaper", "swap Day 2 for something indoors", or "regenerate Day 1".',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID' },
      dayIndex: { type: 'number', description: '0-based day index (Day 1 = 0, Day 2 = 1, etc.)' },
      reason: { type: 'string', description: 'Why the day is being regenerated (e.g. "cheaper", "rainy day", "indoor")' },
    },
    required: ['dayIndex'],
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip) return { result: { error: 'No trip found' } };
    if (!trip.itinerary) return { result: { error: 'Trip has no itinerary yet. Call createItinerary first.' } };

    const dayIdx = Number(args.dayIndex);

    // Generate a full itinerary with a seed offset (by tweaking the id) to produce a different day
    const offset = Math.floor(Date.now() / 1000) % 1000; // Time-based variety
    if (!trip.destinationProfile) return { result: { error: 'Destination profile missing.' } };
    const freshDays = generateItinerary({ ...trip, id: (trip.id || '') + `_regen_${offset}` }, trip.destinationProfile);
    const newDay = freshDays[dayIdx] ?? freshDays[0];
    newDay.dayIndex = dayIdx;
    if (trip.itinerary.days[dayIdx]?.date) {
      newDay.date = trip.itinerary.days[dayIdx].date;
    }

    const updatedDays = [...trip.itinerary.days];
    updatedDays[dayIdx] = newDay;
    const itinerary = { days: updatedDays };
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);

    const updatedTrip = await ctx.tripRepository.upsert({ ...trip, itinerary, budgetBreakdown });
    ctx.currentTrip = updatedTrip;

    return {
      result: {
        day: newDay,
        message: `Day ${dayIdx + 1} regenerated with ${newDay.activities.length} activities.`,
      },
    };
  },
};
