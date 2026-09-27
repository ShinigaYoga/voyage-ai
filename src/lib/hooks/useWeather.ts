"use client";

import { useState, useEffect } from "react";
import { WeatherForecast } from "@/lib/services/weather/WeatherService";
import { getWeatherService, resolveCoords } from "@/lib/services/weather";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  forecasts: WeatherForecast[];
  cachedAt: number;
}

// In-memory cache (survives component remounts within same session)
const memCache = new Map<string, CacheEntry>();

export function useWeather(destination: string | undefined, days = 7) {
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destination) return;

    async function fetchWeather() {
      const cacheKey = `${destination}_${days}`;

      // Check in-memory cache first
      const cached = memCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        setForecasts(cached.forecasts);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const coords = await resolveCoords(destination!);
        if (!coords) {
          setError("Could not find coordinates for this destination.");
          return;
        }

        const service = getWeatherService();
        const data = await service.getForecast(coords.lat, coords.lon, days);

        memCache.set(cacheKey, { forecasts: data, cachedAt: Date.now() });
        setForecasts(data);
      } catch (err: any) {
        console.warn("[useWeather] Failed to fetch weather", err);
        setError("Weather unavailable");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [destination, days]);

  return { forecasts, loading, error };
}
