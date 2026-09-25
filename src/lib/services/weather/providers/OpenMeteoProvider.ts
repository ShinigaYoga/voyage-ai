import { WeatherForecast, WeatherProvider } from "../types";

// WMO Weather interpretation codes → condition + emoji
function mapWeatherCode(code: number): { condition: WeatherForecast["condition"]; icon: string; description: string } {
  if (code === 0) return { condition: "clear", icon: "☀️", description: "Clear sky" };
  if (code <= 3) return { condition: "clear", icon: "⛅", description: "Partly cloudy" };
  if (code <= 48) return { condition: "cloudy", icon: "☁️", description: "Cloudy / Fog" };
  if (code <= 67) return { condition: "rain", icon: "🌧️", description: "Rain" };
  if (code <= 77) return { condition: "snow", icon: "❄️", description: "Snow" };
  if (code <= 82) return { condition: "rain", icon: "🌦️", description: "Rain showers" };
  if (code <= 99) return { condition: "storm", icon: "⛈️", description: "Thunderstorm" };
  return { condition: "cloudy", icon: "🌥️", description: "Unknown" };
}

export class OpenMeteoProvider implements WeatherProvider {
  private readonly baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getForecast(lat: number, lon: number, days = 7): Promise<WeatherForecast[]> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
      timezone: "auto",
      forecast_days: Math.min(days, 14).toString(),
    });

    const res = await fetch(`${this.baseUrl}?${params}`, {
      // 10-second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.status}`);
    }

    const data = await res.json();
    const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = data.daily;

    return (time as string[]).map((date, i) => {
      const { condition, icon, description } = mapWeatherCode(weathercode[i] ?? 0);
      return {
        date,
        tempMax: Math.round(temperature_2m_max[i] ?? 0),
        tempMin: Math.round(temperature_2m_min[i] ?? 0),
        precipitationMm: Math.round((precipitation_sum[i] ?? 0) * 10) / 10,
        condition,
        icon,
        description,
      };
    });
  }

  async getCurrent(lat: number, lon: number): Promise<WeatherForecast> {
    const forecasts = await this.getForecast(lat, lon, 1);
    if (forecasts.length === 0) throw new Error("No forecast data");
    return forecasts[0];
  }
}
