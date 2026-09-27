import { DESTINATION_COORDS } from "@/lib/services/weather";

/** Deterministic offset in degrees (~5km max) from a string seed */
function hashOffset(seed: string): { dLat: number; dLon: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  // Two independent values via LCG steps
  let a = (Math.imul(h, 1664525) + 1013904223) | 0;
  let b = (Math.imul(a, 1664525) + 1013904223) | 0;
  // Unsigned → [0,1)
  const fa = (a >>> 0) / 4294967296;
  const fb = (b >>> 0) / 4294967296;
  return {
    dLat: (fa - 0.5) * 0.09, // ±~5 km
    dLon: (fb - 0.5) * 0.09,
  };
}

/**
 * Returns deterministic {lat, lon} for an activity by:
 *   1. Using the activity's own lat/lon if already set and valid.
 *   2. Hashing the activity name against the destination center.
 *   3. Returning null if destination center is unknown.
 *
 * Never returns 0,0.
 */
export function resolveActivityCoords(
  activityName: string,
  activityLat: number | undefined,
  activityLon: number | undefined,
  destination: string
): { lat: number; lon: number } | null {
  // Prefer stored coords if valid
  if (activityLat && activityLon && activityLat !== 0 && activityLon !== 0) {
    return { lat: activityLat, lon: activityLon };
  }

  // Look up destination center (case-insensitive)
  const entry = Object.entries(DESTINATION_COORDS).find(
    ([k]) => k.toLowerCase() === destination.toLowerCase()
  );
  if (!entry) return null;

  const [, center] = entry;
  const { dLat, dLon } = hashOffset(activityName + destination);
  return {
    lat: Number((center.lat + dLat).toFixed(5)),
    lon: Number((center.lon + dLon).toFixed(5)),
  };
}

/**
 * Derives an origin coordinate for distance calculations from the trip.
 * Priority: selectedHotel.lat/lon → hotel booking details → destination center.
 */
export function resolveOriginCoords(
  trip: {
    destination?: string;
    selectedHotel?: { lat?: number; lon?: number; name?: string };
    bookings?: any[];
  }
): { lat: number; lon: number; label?: string } | null {
  // 1. Explicit selectedHotel field with coordinates
  if (trip.selectedHotel?.lat && trip.selectedHotel?.lon) {
    return {
      lat: trip.selectedHotel.lat,
      lon: trip.selectedHotel.lon,
    };
  }

  // 2. Hotel booking in bookings array — find one with lat/lon in details
  if (trip.bookings) {
    for (const b of trip.bookings) {
      if (b.itemType === 'hotel' && b.details?.lat && b.details?.lon) {
        return { lat: b.details.lat, lon: b.details.lon };
      }
    }
  }

  // 3. Destination center fallback
  if (!trip.destination) return null;
  const entry = Object.entries(DESTINATION_COORDS).find(
    ([k]) => k.toLowerCase() === trip.destination!.toLowerCase()
  );
  if (!entry) return null;
  return { lat: entry[1].lat, lon: entry[1].lon, label: "center" };
}
