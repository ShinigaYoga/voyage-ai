import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";
import { ACTIVITY_BANK, ActivityTemplate } from "@/lib/itinerary/activityBank";
import { getDestinationProfile } from "@/lib/itinerary/destinations";
import { getWeatherService } from "@/lib/services/weather";
import { Activity } from "@/lib/types";

export const replanDayTool: ToolDefinition = {
  name: "replanDay",
  description: "Modifies a specific day in the itinerary based on weather, budget, preference, or delay.",
  parameters: {
    type: "object",
    properties: {
      dayIndex: { type: "number", description: "The 0-based index of the day to replan." },
      reason: { type: "string", enum: ["weather", "budget", "preference", "delay"], description: "The reason for replanning." },
      details: { type: "string", description: "Specific instructions or details for replanning." },
    },
    required: ["dayIndex", "reason"],
  },
  execute: async (args: { dayIndex: number; reason: string; details?: string }, ctx) => {
    const { dayIndex, reason } = args;
    const trip = ctx.currentTrip;

    if (!trip || !trip.itinerary || !trip.itinerary.days[dayIndex]) {
      return { result: { success: false, error: "Invalid trip or dayIndex." } };
    }

    const day = trip.itinerary.days[dayIndex];
    const profile = getDestinationProfile(trip.destination, trip.preferences);
    const bank = ACTIVITY_BANK[profile.category];
    const changes: string[] = [];

    // Weather replanning logic
    if (reason === "weather") {
      const weatherService = getWeatherService();
      const weather = await weatherService.getWeather({ destination: trip.destination, date: day.date });
      
      const dayWeather = weather.length > 0 ? weather[0] : null;
      const isBadWeather = dayWeather && (dayWeather.condition === "rain" || dayWeather.condition === "storm" || dayWeather.condition === "snow");

      if (isBadWeather || args.details?.toLowerCase().includes("rain")) {
        const newActivities: Activity[] = [];
        
        for (const act of day.activities) {
          if (act.category === "nature") { // Typically outdoor
            // Find slot based on startTime
            const hour = parseInt(act.startTime.split(":")[0]);
            let slotLabel = "morning";
            if (hour >= 12 && hour < 14) slotLabel = "midday";
            else if (hour >= 14 && hour < 17) slotLabel = "afternoon";
            else if (hour >= 17) slotLabel = "evening";

            const candidates = bank[slotLabel] || [];
            // Find indoor alternatives
            const indoorCandidates = candidates.filter(c => c.category !== "nature");
            
            if (indoorCandidates.length > 0) {
              const replacement = indoorCandidates[Math.floor(Math.random() * indoorCandidates.length)];
              newActivities.push({
                ...act,
                name: replacement.name,
                location: replacement.location,
                category: replacement.category,
                description: replacement.description,
                price: replacement.priceMin + Math.floor(Math.random() * (replacement.priceMax - replacement.priceMin + 1)),
                bookingRequired: replacement.bookingRequired,
              });
              changes.push(`Replaced ${act.name} with ${replacement.name} due to weather.`);
            } else {
              newActivities.push(act);
            }
          } else {
            newActivities.push(act); // Preserve food, evening, indoor
          }
        }
        day.activities = newActivities;
      } else {
        changes.push("Weather looks fine, no outdoor activities replaced.");
      }
    } else {
      changes.push(`Replanning for ${reason} is acknowledged, but full logic is pending.`);
    }

    if (changes.length > 0) {
      // Recalculate budget
      trip.budgetBreakdown = calculateBudgetBreakdown(trip);

      // Persist
      await ctx.tripRepository.upsert(trip);
      ctx.currentTrip = trip;

      return {
        result: {
          success: true,
          dayIndex,
          changes,
        },
        artifact: {
          type: "tripUpdated",
          changes,
        },
      };
    }

    return { result: { success: true, message: "No changes made." } };
  },
};
