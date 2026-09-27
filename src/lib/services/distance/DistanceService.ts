import { haversineKm } from './haversine';

export interface DistanceResult {
  distanceKm: number;
  travelMinutes: number;
  mode: "walk" | "auto" | "cab";
  label: string;
}

export class DistanceService {
  /**
   * Calculates distance and travel time between two coordinates.
   * Rules:
   * - distance < 1.5 km -> walk at 12 km/h
   * - 1.5 km <= distance < 15 km -> auto at 22 km/h
   * - distance >= 15 km -> cab at 45 km/h
   */
  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): DistanceResult | null {
    if (lat1 === 0 && lon1 === 0) return null;
    if (lat2 === 0 && lon2 === 0) return null;
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;

    let distanceKm = haversineKm(lat1, lon1, lat2, lon2);
    
    // Prevent NaN or infinite
    if (isNaN(distanceKm) || !isFinite(distanceKm)) {
      return null;
    }

    let mode: "walk" | "auto" | "cab";
    let speedKmh: number;

    if (distanceKm < 1.5) {
      mode = "walk";
      speedKmh = 12;
    } else if (distanceKm < 15) {
      mode = "auto";
      speedKmh = 22;
    } else {
      mode = "cab";
      speedKmh = 45;
    }

    // Minimum distance for 0km cases
    if (distanceKm < 0.1) distanceKm = 0.1;

    let travelMinutes = Math.round((distanceKm / speedKmh) * 60);
    // Minimum 1 min
    if (travelMinutes < 1) travelMinutes = 1;

    // Formatting label
    let distanceLabel = "";
    if (distanceKm < 1) {
      distanceLabel = `${Math.round(distanceKm * 1000)} m`;
    } else {
      distanceLabel = `${distanceKm.toFixed(1)} km`;
    }

    const label = `${distanceLabel} · ${travelMinutes} min ${mode}`;

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      travelMinutes,
      mode,
      label
    };
  }
}
