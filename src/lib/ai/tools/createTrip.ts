import { ToolDefinition } from "./types";
import { resolveCoords } from "@/lib/services/weather";
import { DestinationResearchService } from "@/lib/services/destination/DestinationResearchService";
import { generateItinerary } from "@/lib/itinerary/generator";
import { calculateBudgetBreakdown, generateBudgetRecommendations } from "@/lib/budget/engine";
import { parseItineraryDateRequest } from "./itineraryDates";

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
    // Preserve "N days" phrasing so parseDays() in generator can read it
    let datesStr: string;
    if (startDate && endDate) {
      datesStr = `${startDate} - ${endDate}`;
    } else if (startDate) {
      datesStr = startDate; // may be "3 days" or an ISO date
    } else {
      datesStr = 'Dates TBD';
    }

    const coords = await resolveCoords(destination);

    let newTrip = await ctx.tripRepository.create({
      name: `${destination} Expedition`,
      destination,
      destinationCoords: coords || undefined,
      travelers: Number.isFinite(travelers) && travelers > 0 ? travelers : 1,
      budget: budgetStr,
      dates: datesStr,
    });

    // Update current context trip ID
    ctx.tripId = newTrip.id;
    ctx.currentTrip = newTrip;

    // Mark trip as pending immediately so it always appears in IDB
    newTrip.profileStatus = 'pending';
    await ctx.tripRepository.upsert(newTrip);

    // Run research (awaited because createItinerary may be called right after by the agent)
    if (ctx.aiProvider) {
      try {
        const service = new DestinationResearchService(ctx.aiProvider);
        const profile = await service.research(destination);
        newTrip.destinationProfile = profile;
        newTrip.profileStatus = 'ready';
        await ctx.tripRepository.upsert(newTrip);
      } catch (err) {
        console.error('[createTrip] Destination research failed:', err);
        newTrip.destinationProfile = {
          destination: destination,
          region: '',
          category: 'mixed',
          tagline: `Explore ${destination}`,
          bestSeason: 'Year-round',
          avgCostPerDayINR: 2500,
          idealDurationDays: 3,
          hubs: [{
            name: destination,
            description: `Central ${destination}`,
            typicalStayDays: 1,
            highlights: [],
            coordinates: { lat: 0, lon: 0 }
          }],
          attractions: [
            { name: `${destination} City Center Walk`, hub: destination, category: 'culture', description: 'Explore the main streets and landmarks.', entryFeeINR: 0, durationMinutes: 90, coordinates: { lat: 0, lon: 0 } },
            { name: `${destination} Central Market`, hub: destination, category: 'shopping', description: 'Local market with crafts and produce.', entryFeeINR: 0, durationMinutes: 60, coordinates: { lat: 0, lon: 0 } },
            { name: `${destination} Local Cuisine`, hub: destination, category: 'food', description: 'Try regional specialties.', entryFeeINR: 500, durationMinutes: 75, coordinates: { lat: 0, lon: 0 } },
            { name: `${destination} Old Town`, hub: destination, category: 'culture', description: 'Historic quarter and heritage buildings.', entryFeeINR: 0, durationMinutes: 90, coordinates: { lat: 0, lon: 0 } }
          ],
          localCuisine: [],
          transportModes: [],
          notes: '',
          researchedAt: Date.now(),
          researchQuality: 'fallback',
          expansionAttempted: false
        };
        newTrip.profileStatus = 'ready';
        await ctx.tripRepository.upsert(newTrip);
      }
    }

    // Auto-generate itinerary immediately if profile is ready
    const confirmedDates = parseItineraryDateRequest(datesStr, new Date().toISOString().slice(0, 10));
    if (newTrip.destinationProfile && newTrip.profileStatus === 'ready' && confirmedDates.startDate && confirmedDates.endDate) {
      try {
        const days = generateItinerary(newTrip, newTrip.destinationProfile);
        const itinerary = { days };
        const budgetBreakdown = calculateBudgetBreakdown({ ...newTrip, itinerary });
        const budgetRecommendations = generateBudgetRecommendations(budgetBreakdown);
        newTrip = await ctx.tripRepository.upsert({ ...newTrip, itinerary, budgetBreakdown, budgetRecommendations });
        ctx.currentTrip = newTrip;
      } catch (err) {
        console.error('[createTrip] Auto-itinerary generation failed:', err);
      }
    }

    return {
      result: { trip: newTrip, success: true },
      artifact: { type: "trip", trip: newTrip },
    };
  },
};
