import React from "react";
import { WeatherForecast } from "@/lib/services/weather/WeatherService";

interface WeatherCardProps {
  forecasts: WeatherForecast[];
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

export function WeatherCard({ forecasts, loading, error, compact = false }: WeatherCardProps) {
  if (loading) {
    return (
      <div className="bg-sky-50 rounded-card p-5 border border-sky-100 animate-pulse">
        <div className="h-4 bg-sky-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-sky-200 rounded w-1/3" />
      </div>
    );
  }

  if (error || forecasts.length === 0) {
    return (
      <div className="bg-sky-50 rounded-card p-5 border border-sky-100 flex items-center gap-3">
        <span className="text-2xl">🌥️</span>
        <div>
          <div className="text-sm font-medium text-sky-800">Weather</div>
          <div className="text-xs text-sky-600 mt-0.5">{error || "Unavailable"}</div>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact: just show today
    const today = forecasts[0];
    return (
      <div className="bg-sky-50 rounded-card p-5 border border-sky-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-sky-800">Today's Weather</div>
          <div className="text-2xl font-display font-bold text-sky-900 mt-1">{today.tempMax}°C</div>
          <div className="text-xs text-sky-600 mt-0.5">{today.description}</div>
        </div>
        <div className="text-4xl">{today.icon}</div>
      </div>
    );
  }

  // Full 7-day forecast
  return (
    <div className="bg-sky-50 rounded-card p-5 border border-sky-100">
      <div className="text-sm font-bold text-sky-800 mb-3 flex items-center gap-2">
        <span>🌤️</span> 7-Day Forecast
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {forecasts.slice(0, 7).map((day) => {
          const label = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={day.date}
              className="flex flex-col items-center bg-white  rounded-lg px-3 py-2 shadow-xs border border-sky-100  shrink-0 min-w-16"
            >
              <div className="text-xs text-ink-500 font-medium">{label.split(",")[0]}</div>
              <div className="text-xl my-1">{day.icon}</div>
              <div className="text-sm font-bold text-ink-900">{day.tempMax}°</div>
              <div className="text-xs text-ink-400">{day.tempMin}°</div>
              {day.precipitationMm > 0 && (
                <div className="mt-1 bg-coral-100 text-coral-700 text-[10px] px-1.5 py-0.5 rounded-sm font-bold">Rain</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
