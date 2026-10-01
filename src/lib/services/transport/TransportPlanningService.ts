import { TransportPlan, TrendPoint } from "./planningTypes";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class TransportPlanningService {
  /**
   * Generates a planning window and transport estimates for a future trip.
   */
  public generateTransportPlan(origin: string, destination: string, departureDate: string): TransportPlan[] {
    const today = new Date();
    // Strip time for clean comparison
    today.setHours(0, 0, 0, 0);
    const depDate = new Date(departureDate);
    depDate.setHours(0, 0, 0, 0);
    
    let daysToDeparture = Math.floor((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // If in the past or very soon, lock window
    if (daysToDeparture < 0) daysToDeparture = 0;

    const routeKey = `${origin.toLowerCase().trim()}->${destination.toLowerCase().trim()}`;
    const seed = hashString(routeKey);
    // Mock distance between 200km and 3000km
    const distanceKm = 200 + (seed % 2800);
    
    const plans: TransportPlan[] = [];

    // Applicable modes heuristic
    // Flight: applies if distance > 300km
    // Train: applies almost everywhere, let's say distance < 2500km
    // Bus: applies if distance < 1000km
    
    if (distanceKm > 300) {
      plans.push(this.createPlanForMode("flight", distanceKm, daysToDeparture, seed, depDate, today));
    }
    if (distanceKm < 2500) {
      plans.push(this.createPlanForMode("train", distanceKm, daysToDeparture, seed, depDate, today));
    }
    if (distanceKm < 1000) {
      plans.push(this.createPlanForMode("bus", distanceKm, daysToDeparture, seed, depDate, today));
    }

    return plans;
  }

  private createPlanForMode(
    mode: "flight" | "train" | "bus",
    distanceKm: number,
    daysToDeparture: number,
    seed: number,
    depDate: Date,
    today: Date
  ): TransportPlan {
    // Base pricing heuristics
    let basePrice = 0;
    if (mode === "flight") basePrice = (distanceKm * 4) + (seed % 2000);
    if (mode === "train") basePrice = (distanceKm * 1.5) + (seed % 500);
    if (mode === "bus") basePrice = (distanceKm * 1.2) + (seed % 300);
    
    // Generate milestones
    const trend: TrendPoint[] = [];
    const windowStartDays = Math.min(180, daysToDeparture);
    const windowEndDays = Math.min(60, daysToDeparture);
    
    let lowerStartDays = Math.min(120, daysToDeparture);
    let lowerEndDays = Math.min(60, daysToDeparture);
    
    if (daysToDeparture <= 7) {
      // Very close to departure
      trend.push({ milestone: "Today", date: this.formatDate(today), estimate: basePrice * 1.5 });
      trend.push({ milestone: "Departure", date: this.formatDate(depDate), estimate: basePrice * 1.6 });
    } else {
      // 4 points
      const p1 = Math.floor(daysToDeparture);
      const p2 = Math.floor(daysToDeparture * 0.66);
      const p3 = Math.floor(daysToDeparture * 0.33);
      const p4 = 0; // departure
      
      const dates = [
        { d: p1, name: p1 > 150 ? "6mo" : p1 > 90 ? "3mo" : "Start" },
        { d: p2, name: p2 > 60 ? "2mo" : p2 > 30 ? "1mo" : "Mid" },
        { d: p3, name: p3 > 21 ? "3w" : p3 > 14 ? "2w" : "Soon" },
        { d: p4, name: "Departure" }
      ];

      dates.forEach(point => {
        const pointDate = new Date(depDate.getTime() - point.d * 24 * 60 * 60 * 1000);
        
        let multiplier = 1.0;
        // Flight: U-shaped, cheapest at ~90-60 days
        if (mode === "flight") {
          if (point.d > 120) multiplier = 1.1;
          else if (point.d >= 60) multiplier = 0.9;
          else if (point.d < 14) multiplier = 1.5;
          else multiplier = 1.2;
        } 
        // Train/Bus: flat then rising
        else {
          if (point.d > 60) multiplier = 1.0;
          else if (point.d < 10) multiplier = 1.3;
          else multiplier = 1.1;
        }

        trend.push({
          milestone: point.name,
          date: this.formatDate(pointDate),
          estimate: Math.round(basePrice * multiplier)
        });
      });
    }

    const minEst = Math.min(...trend.map(t => t.estimate));
    const maxEst = Math.max(...trend.map(t => t.estimate));

    const startDate = new Date(depDate.getTime() - lowerStartDays * 24 * 60 * 60 * 1000);
    const endDate = new Date(depDate.getTime() - lowerEndDays * 24 * 60 * 60 * 1000);

    // Duration estimate
    let durationHours = 0;
    if (mode === "flight") durationHours = Math.max(1, distanceKm / 600);
    if (mode === "train") durationHours = Math.max(2, distanceKm / 60);
    if (mode === "bus") durationHours = Math.max(3, distanceKm / 50);

    const hrs = Math.floor(durationHours);
    const mins = Math.floor((durationHours - hrs) * 60);

    let trendDirection: "rising" | "falling" | "flat" | "u-shaped" = "rising";
    if (mode === "flight") trendDirection = "u-shaped";
    else if (mode === "train" || mode === "bus") trendDirection = "rising";

    return {
      mode,
      priceRange: { min: minEst, max: maxEst, currency: "INR", isEstimate: true },
      bookingWindow: {
        start: this.formatDate(new Date(depDate.getTime() - windowStartDays * 24 * 60 * 60 * 1000)),
        end: this.formatDate(new Date(depDate.getTime() - windowEndDays * 24 * 60 * 60 * 1000))
      },
      trend,
      trendDirection,
      availability: daysToDeparture < 7 ? "limited" : "unknown",
      lowerPriceWindow: {
        start: this.formatDate(startDate),
        end: this.formatDate(endDate),
        confidence: "medium"
      },
      source: "estimate",
      duration: `${hrs}h ${mins}m`
    };
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
  }
}
