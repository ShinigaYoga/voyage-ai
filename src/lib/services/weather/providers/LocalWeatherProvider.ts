import { WeatherForecast, WeatherProvider } from "../types";

/**
 * Minimal fallback provider that generates pseudo-random weather based on coordinates and date.
 */
export class LocalWeatherProvider implements WeatherProvider {
  async getForecast(lat: number, lon: number, days = 7): Promise<WeatherForecast[]> {
    const forecasts: WeatherForecast[] = [];
    const now = new Date();
    
    // Use coordinates to generate a seeded baseline temperature
    const baseTemp = 20 + Math.abs(lat % 10) - Math.abs(lon % 5);

    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      
      const isRainy = (Math.abs(lat) + i) % 5 === 0;
      const condition = isRainy ? "rain" : "clear";
      const icon = isRainy ? "🌧️" : "☀️";
      const desc = isRainy ? "Rain" : "Clear sky";

      forecasts.push({
        date: dateStr,
        tempMax: Math.round(baseTemp + 5 + (i % 3)),
        tempMin: Math.round(baseTemp - 5 - (i % 2)),
        precipitationMm: isRainy ? 10 + i : 0,
        condition,
        icon,
        description: desc,
      });
    }

    return forecasts;
  }

  async getCurrent(lat: number, lon: number): Promise<WeatherForecast> {
    const forecasts = await this.getForecast(lat, lon, 1);
    return forecasts[0];
  }
}
