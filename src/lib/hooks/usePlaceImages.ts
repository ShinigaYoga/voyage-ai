/**
 * usePlaceImages – client-side hook that lazily enriches a list of items with
 * place images via the /api/place-image route.
 *
 * Features:
 * - Runs after render; never blocks itinerary generation.
 * - sessionStorage cache (v3, keyed by name+destination+coords).
 * - In-flight deduplication (Promise map) so duplicate cards share one request.
 * - Concurrency cap of 4 parallel requests.
 * - Retry with exponential back-off (1 retry after 400 ms).
 * - Each card updates independently as images resolve.
 * - Passes lat/lng when available for higher-quality Commons geosearch.
 */
"use client";

import { useEffect, useState } from "react";

export interface PlaceImageResult {
  imageUrl?: string;
  imageAlt?: string;
  source?: string;
  attribution?: string;
  confidence: number;
  reason?: string;
}

const CONCURRENCY = 4;
const SESSION_PREFIX = "placeimg_v4_";

function sessionKey(name: string, type: "hotel" | "attraction", destination: string, lat?: number | null, lng?: number | null): string {
  const latStr = lat != null ? lat.toFixed(3) : "";
  const lngStr = lng != null ? lng.toFixed(3) : "";
  return `${type}|${name.toLowerCase().trim()}|${destination.toLowerCase().trim()}|${latStr}|${lngStr}`;
}

function getCached(key: string): PlaceImageResult | null {
  try {
    const v = sessionStorage.getItem(SESSION_PREFIX + key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function setCache(key: string, result: PlaceImageResult) {
  try {
    sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(result));
  } catch { /* quota exceeded – ignore */ }
}

// In-flight map: key → Promise. Deduplicates concurrent requests for same place.
const inFlight = new Map<string, Promise<PlaceImageResult>>();

async function fetchPlaceImage(
  name: string,
  type: "hotel" | "attraction",
  destination: string,
  lat?: number | null,
  lng?: number | null,
): Promise<PlaceImageResult> {
  const key = sessionKey(name, type, destination, lat, lng);
  const cached = getCached(key);
  if (cached) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<PlaceImageResult> => {
    let retries = 1;
    let delay = 400;

    while (retries >= 0) {
      try {
        const params = new URLSearchParams({ name, type, destination });
        if (lat != null) params.set("lat", String(lat));
        if (lng != null) params.set("lng", String(lng));

        const res = await fetch(`/api/place-image?${params}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const result: PlaceImageResult = {
          imageUrl: data.imageUrl ?? undefined,
          imageAlt: data.imageAlt,
          source: data.source,
          attribution: data.attribution,
          confidence: data.confidence ?? 0,
          reason: data.reason,
        };
        setCache(key, result);
        return result;
      } catch (err: any) {
        if (retries === 0) {
          console.warn(`[usePlaceImages] Failed for "${name}":`, err?.message);
          return { confidence: 0, reason: "fetch_error" };
        }
        retries--;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
    return { confidence: 0, reason: "exhausted" };
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

export interface PlaceImageable {
  id: string;
  name: string;
  imageUrl?: string;
  imageAlt?: string;
  imageSource?: string;
  attribution?: string;
  /** Optional coordinates for higher-quality Commons geosearch */
  lat?: number | null;
  lon?: number | null;
  lng?: number | null;
  category?: string;
}

/**
 * Enriches an array of hotels or attractions with real place images.
 * Returns enriched items; originals are not mutated.
 * Each card updates independently as its image resolves.
 */
export function usePlaceImages<T extends PlaceImageable>(
  items: T[],
  type: "hotel" | "attraction",
  destination: string,
): T[] {
  const [enriched, setEnriched] = useState<T[]>(items);

  useEffect(() => {
    if (!items.length || !destination) return;
    setEnriched(items); // reset immediately on new items

    let cancelled = false;

    const tasks = items.map((item, idx) => async () => {
      // Hotel provider URLs are illustrative, not property-specific; resolve each
      // recommendation by its actual name and destination.
      if (type !== "hotel" && item.imageUrl && !item.imageUrl.includes("source.unsplash.com")) {
        return { idx, enrichedItem: item };
      }

      const lat = item.lat ?? null;
      const lng = item.lng ?? item.lon ?? null;

      const result = await fetchPlaceImage(item.name, type, destination, lat, lng);

      const enrichedItem: T = result.imageUrl
        ? {
            ...item,
            imageUrl: result.imageUrl,
            imageAlt: result.imageAlt,
            imageSource: result.source,
            attribution: result.attribution,
          }
        : { ...item, imageUrl: undefined };

      return { idx, enrichedItem };
    });

    // Run with concurrency cap; update each card independently as it resolves
    let index = 0;
    const slots = Math.min(CONCURRENCY, tasks.length);

    const runSlot = async () => {
      while (index < tasks.length) {
        const i = index++;
        const { idx, enrichedItem } = await tasks[i]();
        if (!cancelled) {
          setEnriched(prev => {
            const next = [...prev];
            next[idx] = enrichedItem;
            return next;
          });
        }
      }
    };

    Promise.all(Array.from({ length: slots }, () => runSlot()));

    return () => { cancelled = true; };
  }, [items, type, destination]);

  return enriched;
}
