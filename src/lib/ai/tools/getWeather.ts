import { ToolDefinition } from "./types";
import { getWeatherService } from "@/lib/services/weather";

export const getWeatherTool: ToolDefinition = {
  name: "getWeather",
  description:
    "Fetches a real weather forecast for a destination. Call this when the user asks about weather, packing advice, or wants weather-aware itinerary adjustments. Never invent weather data.",
  parameters: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        description: "The destination city or region to get weather for. Defaults to the current trip destination.",
      },
      date: {
        type: "string",
        description: "Optional specific date (YYYY-MM-DD). If omitted, returns forecast for the next 7 days.",
      },
    },
  },
  async execute(args: { destination?: string; date?: string }, ctx) {
    const destination = args.destination || ctx.currentTrip?.destination || "Destination";

    try {
      const service = getWeatherService();
      const forecasts = await service.getWeather({ destination, date: args.date });

      if (forecasts.length === 0) {
        const error = `Could not find weather data for "${destination}".`;
        return {
          result: { success: false, error },
          artifact: { type: "weather", destination, forecasts, summary: error },
        };
      }

      const weatherResult = {
        success: true,
        destination,
        forecasts: forecasts.map((f) => ({
          date: f.date,
          tempMax: f.tempMax,
          tempMin: f.tempMin,
          precipitationMm: f.precipitationMm,
          condition: f.condition,
          icon: f.icon,
          description: f.description,
        })),
        summary: forecasts.slice(0, 3)
          .map((f) => `${f.date}: ${f.icon} ${f.description}, ${f.tempMin}–${f.tempMax}°C`)
          .join("; "),
      };

      return {
        result: weatherResult,
        artifact: {
          type: "weather",
          ...weatherResult
        }
      };
    } catch (err: unknown) {
      const details = err instanceof Error ? err.message : String(err);
      const error = `Weather service unavailable: ${details}`;
      return {
        result: { success: false, error },
        artifact: { type: "weather", destination, forecasts: [], summary: error },
      };
    }
  },
};
