export type Restaurant = {
  id: string;
  name: string;
  cuisine: string[];
  priceRange: '₹' | '₹₹' | '₹₹₹';
  rating: number;
  signatureDishes: string[];
  location: string;
  imageUrl?: string;
};
