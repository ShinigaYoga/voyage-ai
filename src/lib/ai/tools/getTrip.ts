import { ToolDefinition } from "./types";
import { getDistanceService } from "@/lib/services/distance";
import { DESTINATION_COORDS } from "@/lib/services/weather";

export const getTripTool: ToolDefinition = {
  name: 'getTrip',
  description: 'Retrieve current trip details.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID, optional if context trip exists' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    if (!id) {
      return { result: { error: "No trip context available" } };
    }
    const trip = await ctx.tripRepository.get(id);

    // Attach distance summaries so AI can reference them naturally
    let distanceSummaries: Record<string, unknown>[] = [];
    if (trip?.itinerary?.days) {
      const ds = getDistanceService();
      const hotel = trip.selectedHotel;
      const destKey = Object.keys(DESTINATION_COORDS).find(
        k => k.toLowerCase() === trip.destination?.toLowerCase()
      );
      const center = trip.destinationCoords || (destKey ? DESTINATION_COORDS[destKey] : null);
      const origin = hotel?.lat && hotel?.lon
        ? { lat: hotel.lat, lon: hotel.lon, from: hotel.name || 'hotel' }
        : center
        ? { lat: center.lat, lon: center.lon, from: 'destination center' }
        : null;

      for (const day of trip.itinerary.days) {
        let totalKm = 0, totalMin = 0;
        const actDistances = day.activities.map((act, idx) => {
          let prev = origin as { lat: number; lon: number } | null;
          if (idx > 0) {
            const p = day.activities[idx - 1];
            if (p.lat && p.lon) prev = { lat: p.lat, lon: p.lon };
          }
          if (!prev || !act.lat || !act.lon) return { name: act.name, distance: null };
          const d = ds.calculateDistance(prev.lat, prev.lon, act.lat, act.lon);
          if (d) { totalKm += d.distanceKm; totalMin += d.travelMinutes; }
          return { name: act.name, distance: d?.label ?? null };
        });
        distanceSummaries.push({
          dayIndex: day.dayIndex,
          origin: origin?.from ?? null,
          activities: actDistances,
          totalKm: Number(totalKm.toFixed(1)),
          totalTravelMinutes: totalMin,
        });
      }
    }

    return {
      result: { trip, distanceSummaries },
      artifact: trip ? { type: "trip", trip } : undefined,
    };
  },
};
