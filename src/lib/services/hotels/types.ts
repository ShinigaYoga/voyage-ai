export type Hotel = {
  id: string;
  name: string;
  location: string;
  pricePerNight: number;
  rating: number;
  amenities: string[];
  imageUrl?: string;
  distanceFromCenter: number;
  recommendationReason?: string;
  lat?: number;
  lon?: number;
};
