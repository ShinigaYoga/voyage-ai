import { ToolDefinition } from "./types";
import { adjustItineraryForBudget, calculateBudgetBreakdown, generateBudgetRecommendations } from "@/lib/budget/engine";
import { DestinationResearchService } from "@/lib/services/destination/DestinationResearchService";
import { generateItinerary } from "@/lib/itinerary/generator";
import { parseItineraryDateRequest } from "./itineraryDates";

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

    const currentTrip = await ctx.tripRepository.get(id);
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
      const parsedDates = parseItineraryDateRequest(args.dates, new Date().toISOString().slice(0, 10));
      patch.dates = parsedDates.days && parsedDates.startDate && parsedDates.endDate
        ? `${parsedDates.days} days ${parsedDates.startDate} - ${parsedDates.endDate}`
        : args.dates;
      changes.push(`Duration/dates set to ${patch.dates}`);
    }
    if (args.budget !== undefined) {
      patch.budget = `₹${Number(args.budget).toLocaleString('en-IN')}`;
      changes.push(`Budget updated to ${patch.budget}`);
    }

    const destinationChanged = Boolean(
      args.destination?.trim() &&
      args.destination.trim().toLowerCase() !== currentTrip?.destination.trim().toLowerCase()
    );
    const needsResearch = destinationChanged || !currentTrip?.destinationProfile;
    let updatedTrip = await ctx.tripRepository.update(id, {
      ...patch,
      ...(needsResearch ? { destinationProfile: undefined, profileStatus: "pending" as const } : {}),
    });

    if (needsResearch) {
      if (!ctx.aiProvider) {
        throw new Error("Destination research provider is unavailable");
      }
      const profile = await new DestinationResearchService(ctx.aiProvider).research(updatedTrip.destination);
      updatedTrip = await ctx.tripRepository.upsert({
        ...updatedTrip,
        destinationProfile: profile,
        profileStatus: "ready",
      });
    }

    if ((args.budget !== undefined || args.travelers !== undefined) && !args.dates && !destinationChanged) {
      const adjusted = adjustItineraryForBudget(updatedTrip, updatedTrip.destinationProfile);
      updatedTrip = await ctx.tripRepository.upsert(adjusted.updatedTrip);
    }

    if ((args.dates || destinationChanged) && updatedTrip.destinationProfile) {
      const itinerary = { days: generateItinerary(updatedTrip, updatedTrip.destinationProfile) };
      const tripWithItinerary = { ...updatedTrip, itinerary };
      const budgetBreakdown = calculateBudgetBreakdown(tripWithItinerary);
      updatedTrip = await ctx.tripRepository.upsert({
        ...tripWithItinerary,
        budgetBreakdown,
        budgetRecommendations: generateBudgetRecommendations(budgetBreakdown),
      });
    }

    ctx.currentTrip = updatedTrip;

    const itinerary = args.dates || destinationChanged ? updatedTrip.itinerary : undefined;
    return {
      result: { trip: updatedTrip, changes },
      artifact: itinerary
        ? {
            type: "itinerary",
            itinerary,
            tripId: updatedTrip.id,
            tripName: updatedTrip.name,
            trip: updatedTrip,
          }
        : { type: 'tripUpdated', changes, trip: updatedTrip },
    };
  },
};
