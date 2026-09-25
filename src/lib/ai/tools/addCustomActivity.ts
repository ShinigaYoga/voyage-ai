import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";

function generateId(): string {
  return `act_custom_${Date.now().toString(36)}`;
}

export const addCustomActivityTool: ToolDefinition = {
  name: 'addCustomActivity',
  description: 'Adds a custom activity to a specific day in the itinerary and recalculates budget.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID' },
      dayIndex: { type: 'number', description: '0-based day index to add the activity to' },
      name: { type: 'string', description: 'Name of the activity' },
      location: { type: 'string', description: 'Location of the activity' },
      startTime: { type: 'string', description: 'Start time in "HH:MM" format' },
      durationMinutes: { type: 'number', description: 'Duration in minutes' },
      price: { type: 'number', description: 'Price in INR per person' },
      category: { type: 'string', description: 'One of: food, culture, nature, nightlife, transport, rest, shopping' },
      description: { type: 'string', description: 'Brief description' },
    },
    required: ['dayIndex', 'name', 'startTime', 'price', 'category'],
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip || !trip.itinerary) return { result: { error: 'Trip or itinerary not found' } };

    const dayIdx = Number(args.dayIndex);
    const targetDay = trip.itinerary.days[dayIdx];
    if (!targetDay) return { result: { error: `Day ${dayIdx} not found` } };

    const newActivity = {
      id: generateId(),
      name: args.name,
      location: args.location || 'Various',
      startTime: args.startTime,
      durationMinutes: Number(args.durationMinutes) || 60,
      price: Number(args.price) || 0,
      category: args.category as any,
      description: args.description || '',
    };

    const updatedDays = trip.itinerary.days.map((day, idx) => {
      if (idx === dayIdx) {
        const activities = [...day.activities, newActivity];
        activities.sort((a, b) => a.startTime.localeCompare(b.startTime));
        return { ...day, activities };
      }
      return day;
    });

    const itinerary = { days: updatedDays };
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
    const updatedTrip = await ctx.tripRepository.upsert({ ...trip, itinerary, budgetBreakdown });
    ctx.currentTrip = updatedTrip;

    return {
      result: {
        success: true,
        message: `Added custom activity "${newActivity.name}" to Day ${dayIdx + 1}.`,
      },
    };
  },
};
