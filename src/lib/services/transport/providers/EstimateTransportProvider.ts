import { TransportOption, TransportSearchParams } from "../types";
import { TransportService } from "../TransportService";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const searchCache = new Map<string, TransportOption[]>();

export class EstimateTransportProvider implements TransportService {
  async search(params: TransportSearchParams): Promise<TransportOption[]> {
    const origin = (params.origin || "Origin").trim();
    const destination = (params.destination || "Destination").trim();
    const dateStr = params.date ? `-${params.date}` : "";
    const key = `${origin.toLowerCase()}->${destination.toLowerCase()}${dateStr}`;
    const baseKey = `${origin.toLowerCase()}->${destination.toLowerCase()}`;
    const cacheKey = JSON.stringify([
      key,
      params.passengers || 1,
      [...(params.preferredModes || [])].sort(),
    ]);
    const cached = searchCache.get(cacheKey);
    if (cached) return cached.map(option => ({ ...option, priceRange: option.priceRange && { ...option.priceRange } }));

    // Deterministic using hash
    const seed = hashString(baseKey);
    const dateSeed = hashString(key);
    
    // Mock distance based on seed between 200km and 3000km
    const distanceKm = 200 + (seed % 2800);

    const flightPrice = Math.round(distanceKm * 4) + (dateSeed % 2000);
    const trainPrice = Math.round(distanceKm * 1.5) + (dateSeed % 1200);
    const busPrice = Math.round(distanceKm * 1.2) + (dateSeed % 500);

    let results: TransportOption[] = [];

    // Applicable modes heuristic
    // Flight: applies if distance > 300km
    // Train: applies if distance < 2500km
    // Bus: applies if distance < 1000km

    if (distanceKm > 300) {
      results.push({
        id: `fl_gen_${seed}_1`,
        mode: "flight",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "07:30",
        arrivalTime: "09:45",
        durationMinutes: Math.max(60, Math.round((distanceKm / 600) * 60)),
        price: flightPrice,
        stops: 0,
        availability: "available",
      });
      // Second flight option slightly later and more expensive
      results.push({
        id: `fl_gen_${seed}_2`,
        mode: "flight",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "14:15",
        arrivalTime: "16:45",
        durationMinutes: Math.max(75, Math.round((distanceKm / 550) * 60)),
        price: flightPrice + 1200,
        stops: 0,
        availability: (dateSeed % 10) > 7 ? "few-seats" : "available",
      });
    }

    if (distanceKm < 2500) {
      results.push({
        id: `tr_gen_${seed}_1`,
        mode: "train",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "16:20",
        arrivalTime: "04:10",
        durationMinutes: Math.max(120, Math.round((distanceKm / 60) * 60)),
        price: trainPrice,
        stops: 4,
        availability: "available",
      });
    }

    if (distanceKm < 1000) {
      results.push({
        id: `bs_gen_${seed}_1`,
        mode: "bus",
        departureCity: origin,
        arrivalCity: destination,
        departureTime: "21:00",
        arrivalTime: "08:30",
        durationMinutes: Math.max(180, Math.round((distanceKm / 50) * 60)),
        price: busPrice,
        stops: 3,
        availability: "available",
      });
    }

    // Apply fluctuations based on date
    const pricedResults = results.map(opt => {
      const fluctuation = ((dateSeed % 50) - 20) / 100; 
      const adjustedPrice = Math.round(opt.price * (1 + fluctuation));
      
      const availState = dateSeed % 10;
      let availability: 'available' | 'few-seats' | 'sold-out' = 'available';
      if (availState === 9) availability = 'sold-out';
      else if (availState > 6) availability = 'few-seats';

      return {
        ...opt,
        id: `${opt.id}_${dateStr}`, // unique ID per date
        price: adjustedPrice,
        priceRange: {
          min: Math.round(adjustedPrice * 0.9),
          max: Math.round(adjustedPrice * 1.1),
        },
        availability,
        isEstimate: true // Flag as estimated data
      } as TransportOption & { isEstimate?: boolean };
    });
    searchCache.set(cacheKey, pricedResults.map(option => ({ ...option })));
    return pricedResults;
  }
}
