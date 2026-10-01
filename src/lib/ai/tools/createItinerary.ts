import { ToolDefinition } from "./types";
import { generateItinerary } from "@/lib/itinerary/generator";
import { calculateBudgetBreakdown, generateBudgetRecommendations } from "@/lib/budget/engine";

export const createItineraryTool: ToolDefinition = {
  name: 'createItinerary',
  description: 'Generates a real, destination-aware day-by-day itinerary based on the current trip. Call this when the user asks for an itinerary or after creating a trip.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to generate itinerary for. Defaults to current trip.' },
      days: { type: 'number', description: 'Override number of days. If omitted, inferred from trip dates.' },
      budget: { type: 'number', description: 'Optional total budget (number, in currency units) to influence itinerary cost choices.' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip) return { result: { error: 'No trip found to generate itinerary for' } };

    // If a budget override is provided, set it on the trip model for generator heuristics
    const workingTrip = { ...trip };
    if (typeof args.budget === 'number') {
      workingTrip.budget = `₹${args.budget}`;
    }

    if (!workingTrip.destinationProfile) {
      return { result: { error: 'Destination profile not ready. Please wait a moment and try again.' } };
    }
    
    // We update trip.dates if days was passed so inferDays will get the right count
    if (args.days) {
      workingTrip.dates = `${args.days} days`;
    }

    const days = generateItinerary(workingTrip, workingTrip.destinationProfile);
    const itinerary = { days };

    // Compute budget from the generated activities
    const tripWithItinerary = { ...trip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
    const recommendations = generateBudgetRecommendations(budgetBreakdown);

    // Persist to server repository, including recommendations for persistence
    const updatedTrip = await ctx.tripRepository.upsert({
      ...trip,
      itinerary,
      budgetBreakdown,
      budgetRecommendations: recommendations,
    });

    ctx.currentTrip = updatedTrip;

    const totalActivities = days.reduce((sum, d) => sum + d.activities.length, 0);

    let formattedMessage = `### Trip Created\n\n**Destination:** ${trip.destination}\n**Duration:** ${days.length} days\n\n`;
    days.forEach(d => {
      formattedMessage += `#### Day ${d.dayIndex + 1}\n`;
      d.activities.forEach(a => {
        const timeLabel = a.startTime < '12:00' ? 'Morning' : a.startTime < '15:00' ? 'Lunch' : a.startTime < '18:00' ? 'Afternoon' : 'Evening';
        formattedMessage += `**${timeLabel}**: ${a.name} — ${a.description}\n\n`;
      });
      formattedMessage += '\n';
    });

    return {
      result: {
        itinerary,
        totalDays: days.length,
        totalActivities,
        budgetBreakdown,
        message: formattedMessage,
        recommendations,
      },
      artifact: {
        type: 'itinerary',
        itinerary,
        tripId: updatedTrip.id,
        tripName: updatedTrip.name,
        trip: updatedTrip,   // full trip so client can upsert to IDB immediately
      },
    };
  },
};
