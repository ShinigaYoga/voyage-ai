export type Attraction = {
  id: string;
  name: string;
  category: 'beach' | 'fort' | 'temple' | 'museum' | 'nature' | 'market' | 'nightlife';
  description: string;
  entryFee: number;
  durationMinutes: number;
  location: string;
  imageUrl?: string;
  rating: number;
};
