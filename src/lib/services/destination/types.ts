export type DestinationCategory = 'beach' | 'mountain' | 'heritage' | 'backwater' | 'city' | 'mixed';
export type ProfileStatus = 'ready' | 'pending' | 'failed';
export type ResearchQuality = 'full' | 'thin' | 'fallback';

export interface DestinationHub {
  name: string;
  description: string;
  typicalStayDays: number;
  highlights: string[];
  coordinates: { lat: number; lon: number };
}

export interface DestinationAttraction {
  name: string;
  hub: string;
  category: 'nature' | 'culture' | 'food' | 'adventure' | 'shopping' | 'nightlife' | 'rest';
  description: string;
  entryFeeINR: number;
  durationMinutes: number;
  coordinates: { lat: number; lon: number };
  popularityScore?: number;
}

export interface DestinationProfile {
  destination: string;
  region: string;
  category: DestinationCategory;
  tagline: string;
  bestSeason: string;
  avgCostPerDayINR: number;
  idealDurationDays: number;
  hubs: DestinationHub[];
  attractions: DestinationAttraction[];
  localCuisine: string[];
  transportModes: string[];
  notes: string;
  researchedAt: number;
  researchQuality: ResearchQuality;
  expansionAttempted: boolean;
}
