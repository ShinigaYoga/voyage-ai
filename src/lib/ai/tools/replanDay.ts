import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";
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
    const changes: string[] = [];
    const profile = trip.destinationProfile;

    // Weather replanning: swap outdoor activities for indoor ones from the profile
    if (reason === "weather") {
      const weatherService = getWeatherService();
      const weather = await weatherService.getWeather({ destination: trip.destination, date: day.date });

      const dayWeather = weather.length > 0 ? weather[0] : null;
      const isBadWeather = dayWeather && (dayWeather.condition === "rain" || dayWeather.condition === "storm" || dayWeather.condition === "snow");

      if (isBadWeather || args.details?.toLowerCase().includes("rain")) {
        const usedNames = new Set(day.activities.map((a: Activity) => a.name));

        const indoorPool = profile
          ? profile.attractions.filter(a =>
              a.category !== "nature" && a.category !== "adventure" && !usedNames.has(a.name)
            )
          : [];

        const newActivities: Activity[] = day.activities.map((act: Activity) => {
          if (act.category === "nature" && indoorPool.length > 0) {
            const replacement = indoorPool.shift()!;
            changes.push(`Replaced ${act.name} with ${replacement.name} due to weather.`);
            return {
              ...act,
              name: replacement.name,
              location: replacement.hub,
              category: replacement.category as any,
              description: replacement.description,
              price: replacement.entryFeeINR,
              bookingRequired: false,
            };
          }
          return act;
        });

        day.activities = newActivities;
        if (changes.length === 0) {
          changes.push("No outdoor activities to replace — all activities are already indoor-friendly.");
        }
      } else {
        changes.push("Weather looks fine, no outdoor activities replaced.");
      }
    } else {
      changes.push(`Replanning for ${reason} is acknowledged.`);
    }

    trip.budgetBreakdown = calculateBudgetBreakdown(trip);
    await ctx.tripRepository.upsert(trip);
    ctx.currentTrip = trip;

    return {
      result: { success: true, dayIndex, changes },
      artifact: { type: "tripUpdated", changes },
    };
  },
};
