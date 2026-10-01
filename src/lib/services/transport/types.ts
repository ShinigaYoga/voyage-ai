export type TransportOption = {
  id: string;
  mode: 'flight' | 'train' | 'bus';
  provider?: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  stops: number;
  availability: 'available' | 'few-seats' | 'sold-out';
  isEstimate?: boolean;
  priceRange?: { min: number; max: number };
  score?: number;
  recommendationReason?: string;
};

export type TransportSearchParams = {
  origin: string;
  destination: string;
  date?: string;
  passengers?: number;
  budget?: number;
  preferredModes?: Array<'flight' | 'train' | 'bus'>;
};
