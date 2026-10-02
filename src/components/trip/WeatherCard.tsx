import React from "react";
import { WeatherForecast } from "@/lib/services/weather/WeatherService";

interface WeatherCardProps {
  forecasts: WeatherForecast[];
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  title?: string;
  affectedDayNumbers?: number[];
  onReplan?: () => void;
}

export function WeatherCard({
  forecasts,
  loading,
  error,
  compact = false,
  title,
  affectedDayNumbers = [],
  onReplan,
}: WeatherCardProps) {
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
          <div className="text-sm font-medium text-sky-800">Weather unavailable</div>
          {error && <div className="text-xs text-sky-600 mt-0.5">{error}</div>}
        </div>
      </div>
    );
  }

  if (compact) {
    const affectedForecasts = forecasts.filter((_, index) => affectedDayNumbers.includes(index + 1));
    const severeWeather = affectedForecasts.some(forecast =>
      forecast.condition === "storm" || forecast.condition === "snow"
    );
    const affectedDateLabels = affectedForecasts.map(forecast =>
      new Date(`${forecast.date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );
    const affectedDates = affectedDateLabels.length === 1
      ? affectedDateLabels[0]
      : `${affectedDateLabels.slice(0, -1).join(", ")} and ${affectedDateLabels[affectedDateLabels.length - 1]}`;

    return (
      <div className="w-full space-y-3">
        <section className="w-full rounded-card border border-sage-200 bg-white p-4 shadow-soft">
          <h3 className="text-sm font-bold text-ink-900 mb-1 flex items-center gap-2">
            <span>🌤️</span>{title || "Weather during your trip"}
          </h3>
          <p className="mb-3 text-xs text-ink-500">
            {forecasts.length > 1 && `${new Date(`${forecasts[0].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${forecasts[forecasts.length - 1].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Daily weather forecast">
            {forecasts.map(forecast => {
              const dateLabel = new Date(`${forecast.date}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <div key={forecast.date} className="min-w-28 shrink-0 rounded-xl border border-sage-100 bg-sage-50/60 px-3 py-3">
                  <div className="text-xs font-semibold text-ink-700">{dateLabel}</div>
                  <div className="my-2 text-2xl" aria-hidden="true">{forecast.icon}</div>
                  <div className="text-xs font-medium capitalize text-ink-800">
                    {forecast.description || forecast.condition}
                  </div>
                  <div className="mt-2 text-xs font-bold text-ink-900">
                    {forecast.tempMin}° – {forecast.tempMax}°C
                  </div>
                  <div className="mt-1 text-[11px] text-ink-600">
                    Rain: {forecast.precipitationMm} mm
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        {affectedForecasts.length > 0 && (
          <section className="rounded-card border border-amber-200 bg-amber-50 p-3" aria-live="polite">
            <h4 className="text-sm font-bold text-amber-900">
              {severeWeather ? "⛈️ Severe weather" : "🌧️ Rain"} expected on {affectedDates}
            </h4>
            <p className="mt-1 text-xs text-amber-800">
              Some outdoor activities may be affected.
            </p>
            {onReplan && (
              <button
                type="button"
                onClick={onReplan}
                className="mt-3 rounded-pill bg-sage-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sage-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700"
              >
                Replan rainy days
              </button>
            )}
          </section>
        )}
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
