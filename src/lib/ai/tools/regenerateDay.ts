import { ToolDefinition } from "./types";
import { Day, Activity } from "@/lib/types";
import { getActivityImageUrl } from "@/lib/images/activityImage";
import { getWeatherService } from "@/lib/services/weather";
import type { WeatherForecast } from "@/lib/services/weather/types";
import { classifyDayReplanFocus, DayReplanFocus } from "./dayReplanning";

interface ReplanArgs {
  tripId?: string;
  dayIndex: number;
  reason?: string;
  details?: string;
  targetDate?: string;
  skipWeatherLookup?: boolean;
  persist?: boolean;
}

function distanceKm(a: Activity, b: { lat?: number; lon?: number }): number {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return Number.POSITIVE_INFINITY;
  const latDistance = ((b.lat - a.lat) * Math.PI) / 180;
  const lonDistance = ((b.lon - a.lon) * Math.PI) / 180;
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(lonDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getFocus(reason = "", details = ""): DayReplanFocus {
  return classifyDayReplanFocus(`${reason} ${details}`);
}

function isWeatherFocus(focus: DayReplanFocus): boolean {
  return focus.startsWith("weather-");
}

function isOutdoorCategory(category: string): boolean {
  return category === "nature" || category === "adventure" || category === "landmark";
}

function matchesFocus(category: string, focus: DayReplanFocus): boolean {
  if (focus === "indoor" || isWeatherFocus(focus)) return !isOutdoorCategory(category);
  if (focus === "outdoor") return isOutdoorCategory(category);
  if (focus === "food") return category === "food";
  if (focus === "sightseeing") return ["culture", "nature", "adventure", "shopping"].includes(category);
  return true;
}

function attractionActivity(
  attraction: NonNullable<NonNullable<import("@/lib/types").Trip["destinationProfile"]>["attractions"]>[number],
  original: Activity,
  tripId: string,
  dayIndex: number,
  activityIndex: number,
  destination: string,
): Activity {
  const category = attraction.category === "adventure" ? "nature" : attraction.category;
  return {
    id: `act_${tripId}_${dayIndex}_replan_${Date.now()}_${activityIndex}`,
    name: attraction.name,
    location: attraction.hub,
    startTime: original.startTime,
    durationMinutes: Math.max(45, Math.min(240, attraction.durationMinutes || original.durationMinutes || 90)),
    price: attraction.entryFeeINR || 0,
    category,
    description: attraction.description,
    bookingRequired: false,
    lat: attraction.coordinates?.lat,
    lon: attraction.coordinates?.lon,
    imageUrl: getActivityImageUrl(attraction.name, category, destination),
  };
}

function replanActivities(
  day: Day,
  focus: DayReplanFocus,
  profile: NonNullable<import("@/lib/types").Trip["destinationProfile"]>,
  tripId: string,
  destination: string,
  details: string,
  usedOnOtherDays: Set<string>,
): { activities: Activity[]; replacements: string[]; unfilledCount: number } {
  const current = [...day.activities].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (focus === "relaxed") {
    const targetCount = Math.max(1, Math.min(3, Math.ceil(current.length / 2)));
    return { activities: current.slice(0, targetCount), replacements: [], unfilledCount: 0 };
  }

  let targetIndexes = current
    .map((activity, index) => matchesFocus(activity.category, focus) ? -1 : index)
    .filter(index => index >= 0);
  if (!targetIndexes.length && isWeatherFocus(focus)) {
    return { activities: current, replacements: [], unfilledCount: 0 };
  }
  if (!targetIndexes.length) targetIndexes = current.map((_, index) => index);
  if (focus === "outdoor") {
    targetIndexes = current
      .map((activity, index) => isOutdoorCategory(activity.category) ? -1 : index)
      .filter(index => index >= 0);
    if (!targetIndexes.length) targetIndexes = current.map((_, index) => index);
  }

  const retainedNames = new Set(
    current
      .filter((_, index) => !targetIndexes.includes(index))
      .map(activity => activity.name.trim().toLowerCase())
  );
  const allOriginalNames = new Set(current.map(activity => activity.name.trim().toLowerCase()));
  const attractions = profile.attractions
    .filter(attraction => matchesFocus(attraction.category, focus))
    .filter(attraction => !usedOnOtherDays.has(attraction.name.trim().toLowerCase()))
    .filter(attraction => !retainedNames.has(attraction.name.trim().toLowerCase()))
    .filter(attraction => !allOriginalNames.has(attraction.name.trim().toLowerCase()));
  const requestedNames = new Set(
    attractions
      .filter(attraction => attraction.name.trim().length > 3)
      .filter(attraction => details.toLowerCase().includes(attraction.name.trim().toLowerCase()))
      .map(attraction => attraction.name.trim().toLowerCase())
  );

  const updated = [...current];
  const usedNames = new Set(retainedNames);
  const replacements: string[] = [];
  for (const activityIndex of targetIndexes) {
    const original = current[activityIndex];
    const candidates = attractions
      .filter(attraction => !usedNames.has(attraction.name.trim().toLowerCase()))
      .sort((a, b) => {
        const requestedDifference =
          Number(requestedNames.has(b.name.trim().toLowerCase())) -
          Number(requestedNames.has(a.name.trim().toLowerCase()));
        if (requestedDifference !== 0) return requestedDifference;
        const distanceA = distanceKm(original, a.coordinates || {});
        const distanceB = distanceKm(original, b.coordinates || {});
        if (Math.abs(distanceA - distanceB) > 0.1) return distanceA - distanceB;
        return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
      });
    const replacement = candidates[0];
    if (!replacement) continue;
    updated[activityIndex] = attractionActivity(
      replacement,
      original,
      tripId,
      day.dayIndex,
      activityIndex,
      destination,
    );
    usedNames.add(replacement.name.trim().toLowerCase());
    replacements.push(`${original.name} → ${replacement.name}`);
  }

  return {
    activities: updated,
    replacements,
    unfilledCount: targetIndexes.length - replacements.length,
  };
}

export const regenerateDayTool: ToolDefinition = {
  name: "regenerateDay",
  description:
    "Replans and persists only one itinerary day using researched destination attractions. Use for day-specific weather, heat, indoor/outdoor preference, food, sightseeing, distance, or activity-count requests.",
  parameters: {
    type: "object",
    properties: {
      tripId: { type: "string", description: "Trip ID" },
      dayIndex: { type: "number", description: "0-based day index (Day 1 = 0, Day 2 = 1, etc.)" },
      reason: { type: "string", description: "The user's reason, constraint, or focus for changing this day." },
      details: { type: "string", description: "The user's complete day-specific instructions." },
      targetDate: { type: "string", description: "The target itinerary date in YYYY-MM-DD format, when known." },
    },
    required: ["dayIndex"],
  },
  execute: async (args: ReplanArgs, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = args.persist === false
      ? ctx.currentTrip
      : id
        ? await ctx.tripRepository.get(id)
        : ctx.currentTrip;
    if (!trip) throw new Error("No trip found to replan");
    if (!trip.itinerary) throw new Error("Trip has no itinerary to replan");

    const dayIndex = Number(args.dayIndex);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= trip.itinerary.days.length) {
      throw new Error(`Day ${dayIndex + 1} does not exist in this itinerary`);
    }
    if (!trip.destinationProfile) throw new Error("Destination research is unavailable for this trip");

    const day = trip.itinerary.days[dayIndex];
    const focus = getFocus(args.reason, args.details);
    let weatherSummary: string | undefined;
    let weatherForecasts: WeatherForecast[] | undefined;
    if (isWeatherFocus(focus) && !args.skipWeatherLookup) {
      try {
        weatherForecasts = await getWeatherService().getWeather({
          destination: trip.destination,
          date: args.targetDate || day.date,
        });
        const forecast = weatherForecasts.find(item => item.date === (args.targetDate || day.date))
          || (!args.targetDate && !day.date ? weatherForecasts[0] : undefined);
        if (forecast) {
          weatherSummary = `${forecast.condition}, ${forecast.tempMin}–${forecast.tempMax}°C, ${forecast.precipitationMm} mm precipitation`;
        }
      } catch (error: unknown) {
        console.warn(`[regenerateDay] Weather unavailable for ${trip.destination} on ${args.targetDate || day.date || "the itinerary date"}.`, error);
        weatherForecasts = [];
      }
    }

    const { activities, replacements, unfilledCount } = replanActivities(
      day,
      focus,
      trip.destinationProfile,
      trip.id,
      trip.destination,
      args.details || "",
      new Set(trip.itinerary.days
        .filter((_, index) => index !== dayIndex)
        .flatMap(otherDay => otherDay.activities.map(activity => activity.name.trim().toLowerCase()))),
    );
    if (focus !== "relaxed" && unfilledCount > 0) {
      throw new Error(`There are not enough suitable researched attractions to fully replan Day ${dayIndex + 1}`);
    }

    const updatedDay: Day = { ...day, activities };
    const updatedDays = trip.itinerary.days.map((existingDay, index) =>
      index === dayIndex ? updatedDay : existingDay
    );
    const replannedTrip = {
      ...trip,
      itinerary: { ...trip.itinerary, days: updatedDays },
    };
    const updatedTrip = args.persist === false
      ? replannedTrip
      : await ctx.tripRepository.upsert(replannedTrip);
    ctx.currentTrip = updatedTrip;

    const focusLabel = focus.replace("weather-", "");
    const summary = focus === "relaxed"
      ? activities.length < day.activities.length
        ? `Reduced Day ${dayIndex + 1} from ${day.activities.length} to ${activities.length} activities.`
        : `Day ${dayIndex + 1} already has a light schedule; no activities were removed.`
      : replacements.length
        ? `Replanned Day ${dayIndex + 1} for ${focusLabel}: ${replacements.join("; ")}.`
        : `Day ${dayIndex + 1} already has weather-appropriate activities.`;
    const changes = [
      summary,
      ...(weatherSummary ? [`Forecast used: ${weatherSummary}.`] : []),
    ];

    return {
      result: {
        success: true,
        dayIndex,
        day: updatedDay,
        weather: weatherForecasts
          ? { destination: trip.destination, forecasts: weatherForecasts, dayNumber: dayIndex + 1 }
          : undefined,
        changes,
        unchangedDays: updatedDays.filter((_, index) => index !== dayIndex).map(item => item.dayIndex),
      },
      artifact: { type: "tripUpdated", changes, trip: updatedTrip },
    };
  },
};
