import { ToolDefinition } from "./types";
import { generateItinerary } from "@/lib/itinerary/generator";
import { calculateBudgetBreakdown, generateBudgetRecommendations } from "@/lib/budget/engine";
import { DestinationResearchService } from "@/lib/services/destination/DestinationResearchService";

export const createItineraryTool: ToolDefinition = {
  name: 'createItinerary',
  description: 'Generates a real, destination-aware day-by-day itinerary based on the current trip. Call this when the user asks for an itinerary or after creating a trip.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to generate itinerary for. Defaults to current trip.' },
      days: { type: 'number', description: 'Override number of days. If omitted, inferred from trip dates.' },
      startDate: { type: 'string', description: 'Optional itinerary start date in YYYY-MM-DD format.' },
      endDate: { type: 'string', description: 'Optional itinerary end date in YYYY-MM-DD format.' },
      budget: { type: 'number', description: 'Optional total budget (number, in currency units) to influence itinerary cost choices.' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;
    if (!trip) throw new Error('No trip found to generate itinerary for');

    // If a budget override is provided, set it on the trip model for generator heuristics
    let workingTrip = { ...trip };
    let destinationProfile = workingTrip.destinationProfile;
    if (!destinationProfile) {
      if (!ctx.aiProvider) {
        throw new Error("Destination research provider is unavailable");
      }
      destinationProfile = await new DestinationResearchService(ctx.aiProvider).research(workingTrip.destination);
      workingTrip = await ctx.tripRepository.upsert({
        ...workingTrip,
        destinationProfile,
        profileStatus: "ready",
      });
    }

    if (typeof args.budget === 'number') {
      workingTrip.budget = `₹${args.budget}`;
    }

    const itineraryDays = typeof args.days === "number" && args.days > 0 ? Math.floor(args.days) : undefined;
    if (itineraryDays) {
      workingTrip.dates = args.startDate && args.endDate
        ? `${itineraryDays} days ${args.startDate} - ${args.endDate}`
        : `${itineraryDays} days`;
    }

    const days = generateItinerary(workingTrip, destinationProfile);
    const itinerary = { days };

    // Compute budget from the generated activities
    const tripWithItinerary = { ...workingTrip, itinerary };
    const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
    const recommendations = generateBudgetRecommendations(budgetBreakdown);

    // Persist to server repository, including recommendations for persistence
    const updatedTrip = await ctx.tripRepository.upsert({
      ...workingTrip,
      itinerary,
      budgetBreakdown,
      budgetRecommendations: recommendations,
    });

    ctx.currentTrip = updatedTrip;

    const totalActivities = days.reduce((sum, d) => sum + d.activities.length, 0);

    let formattedMessage = `### Trip Created\n\n**Destination:** ${workingTrip.destination}\n**Duration:** ${days.length} days\n\n`;
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
