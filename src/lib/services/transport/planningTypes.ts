export interface PriceRange {
  min: number;
  max: number;
  currency: string;
  isEstimate: true;
}

export interface BookingWindow {
  start: string; // ISO date or localized string
  end: string;
}

export interface TrendPoint {
  milestone: string; // e.g. "6mo", "4mo", "Departure"
  date: string;
  estimate: number;
}

export interface TransportPlan {
  mode: "flight" | "train" | "bus";
  provider?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  priceRange: PriceRange;
  bookingWindow: BookingWindow;
  trend: TrendPoint[];
  trendDirection: "rising" | "falling" | "flat" | "u-shaped";
  availability: "unknown" | "available" | "limited";
  lowerPriceWindow: {
    start: string;
    end: string;
    confidence: "low" | "medium";
  };
  source: "estimate" | "live";
}
