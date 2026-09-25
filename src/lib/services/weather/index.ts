import { WeatherService } from "./WeatherService";

export * from "./types";
export { WeatherService } from "./WeatherService";

export function getWeatherService(): WeatherService {
  return new WeatherService();
}

// Hardcoded coordinates for seeded destinations.
// These avoid Nominatim calls for known destinations.
export const DESTINATION_COORDS: Record<string, { lat: number; lon: number }> = {
  "Goa Coastal": { lat: 15.2993, lon: 74.1240 },
  "Goa": { lat: 15.2993, lon: 74.1240 },
  "Kerala Lakes": { lat: 9.9312, lon: 76.2673 },
  "Kerala": { lat: 9.9312, lon: 76.2673 },
  "Manali Peaks": { lat: 32.2396, lon: 77.1887 },
  "Manali": { lat: 32.2396, lon: 77.1887 },
  "Jaipur Stone": { lat: 26.9124, lon: 75.7873 },
  "Jaipur": { lat: 26.9124, lon: 75.7873 },
};

/**
 * Resolve coordinates for a destination name.
 * Uses hardcoded map for known destinations, then falls back to Nominatim.
 */
export async function resolveCoords(destination: string): Promise<{ lat: number; lon: number } | null> {
  // Check hardcoded map first (case-insensitive)
  const hardcoded = Object.entries(DESTINATION_COORDS).find(
    ([key]) => key.toLowerCase() === destination.toLowerCase()
  );
  if (hardcoded) return hardcoded[1];

  // Fallback: Nominatim geocoding (free, no key)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "VoyageAI/1.0 (travel-planner-demo)" },
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
