import { WeatherForecast, GetWeatherParams, WeatherProvider } from "./types";
import { OpenMeteoProvider } from "./providers/OpenMeteoProvider";
import { LocalWeatherProvider } from "./providers/LocalWeatherProvider";
import { getDB } from "@/lib/repositories/indexeddb/db";
import { resolveCoords } from "./index";

export type { WeatherForecast };

export class WeatherService {
  private primaryProvider: WeatherProvider;
  private fallbackProvider: WeatherProvider;
  private cacheTTL = 30 * 60 * 1000; // 30 minutes in ms

  constructor() {
    this.primaryProvider = new OpenMeteoProvider();
    this.fallbackProvider = new LocalWeatherProvider();
  }

  async getForecast(lat: number, lon: number, days = 7): Promise<WeatherForecast[]> {
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}`;

    // 1. Check IndexedDB Cache
    const db = await getDB();
    if (db) {
      const cached = await db.get("weather_cache", cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
        console.log(`[WeatherService] Cache hit for ${cacheKey}`);
        return cached.data;
      }
    }

    // 2. Fetch from Primary Provider
    let forecasts: WeatherForecast[];
    try {
      forecasts = await this.primaryProvider.getForecast(lat, lon, days);
    } catch (e) {
      console.warn(`[WeatherService] Primary provider failed, using fallback`, e);
      // 3. Fallback Provider
      forecasts = await this.fallbackProvider.getForecast(lat, lon, days);
    }

    // 4. Save to Cache
    if (db && forecasts.length > 0) {
      await db.put("weather_cache", {
        id: cacheKey,
        timestamp: Date.now(),
        data: forecasts,
      });
    }

    return forecasts;
  }

  async getWeather(params: GetWeatherParams): Promise<WeatherForecast[]> {
    const destination = params.destination || "Destination"; // Fallback destination if none provided
    
    // 1. Resolve Coordinates
    const coords = await resolveCoords(destination);
    
    // If we can't find coords, return an empty array or handle error
    if (!coords || (coords.lat === 0 && coords.lon === 0)) {
      console.warn(`[WeatherService] Could not resolve valid coordinates for ${destination}`);
      return [];
    }

    const { lat, lon } = coords;
    
    const forecasts = await this.getForecast(lat, lon, 7);

    // 6. Return Data (Filtered by date if requested)
    return this.filterByDate(forecasts, params.date);
  }

  private filterByDate(forecasts: WeatherForecast[], date?: string): WeatherForecast[] {
    if (!date) return forecasts;
    
    // If a specific date is requested, try to find it
    const specific = forecasts.find(f => f.date === date);
    return specific ? [specific] : forecasts;
  }
}
