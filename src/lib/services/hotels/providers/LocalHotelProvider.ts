import { Hotel } from "../types";
import { resolveCoords, DESTINATION_COORDS } from "../../weather";
import { getHotelImageUrl } from "@/lib/images/activityImage";

// Deterministic coordinate offset (up to ~8km)
function hashToOffset8km(str: string): { dLat: number, dLon: number } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const rng = () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
  return {
    dLat: (rng() - 0.5) * 0.16,
    dLon: (rng() - 0.5) * 0.16
  };
}

const seedData: Record<string, Hotel[]> = {
  Goa: [
    { id: "h-g-1", name: "Taj Exotica", location: "Benaulim", pricePerNight: 12000, rating: 4.8, amenities: ["Pool", "Spa", "Beach Access"], distanceFromCenter: 15, imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80", lat: 15.2493, lon: 73.9310 },
    { id: "h-g-2", name: "W Goa", location: "Vagator", pricePerNight: 15000, rating: 4.6, amenities: ["Pool", "Bar", "Gym"], distanceFromCenter: 18, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80", lat: 15.6015, lon: 73.7342 },
    { id: "h-g-3", name: "The Leela", location: "Mobor", pricePerNight: 18000, rating: 4.9, amenities: ["Private Beach", "Golf Course", "Spa"], distanceFromCenter: 25, imageUrl: "https://images.unsplash.com/photo-1542314831-c6a4d140f61f?auto=format&fit=crop&w=400&q=80", lat: 15.1581, lon: 73.9455 },
    { id: "h-g-4", name: "Alila Diwa", location: "Majorda", pricePerNight: 9000, rating: 4.5, amenities: ["Infinity Pool", "Yoga", "Restaurant"], distanceFromCenter: 12, imageUrl: "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=400&q=80", lat: 15.3090, lon: 73.9103 },
    { id: "h-g-5", name: "Hard Rock Hotel", location: "Calangute", pricePerNight: 7000, rating: 4.2, amenities: ["Live Music", "Pool", "Bar"], distanceFromCenter: 5, imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=400&q=80", lat: 15.5458, lon: 73.7554 },
  ],
  Kerala: [
    { id: "h-k-1", name: "Kumarakom Lake Resort", location: "Kumarakom", pricePerNight: 14000, rating: 4.8, amenities: ["Houseboats", "Ayurveda Spa"], distanceFromCenter: 10, imageUrl: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=400&q=80", lat: 9.6179, lon: 76.4251 },
    { id: "h-k-2", name: "Taj Bekal Resort", location: "Bekal", pricePerNight: 11000, rating: 4.7, amenities: ["Spa", "Beach Access", "Pool"], distanceFromCenter: 8, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80", lat: 12.3952, lon: 75.0298 },
    { id: "h-k-3", name: "Vythiri Resort", location: "Wayanad", pricePerNight: 9000, rating: 4.5, amenities: ["Treehouse", "Nature Walks"], distanceFromCenter: 20, imageUrl: "https://images.unsplash.com/photo-1542314831-c6a4d140f61f?auto=format&fit=crop&w=400&q=80", lat: 11.5204, lon: 76.0428 },
    { id: "h-k-4", name: "The Zuri", location: "Kumarakom", pricePerNight: 12500, rating: 4.6, amenities: ["Spa", "Lake View", "Pool"], distanceFromCenter: 12, imageUrl: "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=400&q=80", lat: 9.6200, lon: 76.4220 },
    { id: "h-k-5", name: "Brunton Boatyard", location: "Kochi", pricePerNight: 10000, rating: 4.7, amenities: ["Heritage", "Harbor View"], distanceFromCenter: 2, imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=400&q=80", lat: 9.9678, lon: 76.2427 },
  ],
  Manali: [
    { id: "h-m-1", name: "Span Resort", location: "Kullu-Manali Hwy", pricePerNight: 13000, rating: 4.6, amenities: ["River View", "Spa", "Lawn"], distanceFromCenter: 14, imageUrl: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=400&q=80", lat: 32.1221, lon: 77.1691 },
    { id: "h-m-2", name: "The Himalayan", location: "Hadimba Road", pricePerNight: 11000, rating: 4.8, amenities: ["Castle Architecture", "Pool", "Mountain View"], distanceFromCenter: 2, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80", lat: 32.2471, lon: 77.1822 },
    { id: "h-m-3", name: "Solang Valley Resort", location: "Solang", pricePerNight: 9500, rating: 4.5, amenities: ["Skiing", "River View", "Gym"], distanceFromCenter: 10, imageUrl: "https://images.unsplash.com/photo-1542314831-c6a4d140f61f?auto=format&fit=crop&w=400&q=80", lat: 32.3168, lon: 77.1585 },
    { id: "h-m-4", name: "Manuallaya", location: "Chadiyari", pricePerNight: 8000, rating: 4.3, amenities: ["Spa", "Indoor Pool", "Bar"], distanceFromCenter: 3, imageUrl: "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=400&q=80", lat: 32.2536, lon: 77.1895 },
    { id: "h-m-5", name: "ShivAdya", location: "Karjan", pricePerNight: 7500, rating: 4.7, amenities: ["Boutique", "Apple Orchards"], distanceFromCenter: 8, imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=400&q=80", lat: 32.2033, lon: 77.1793 },
  ],
  Jaipur: [
    { id: "h-j-1", name: "Rambagh Palace", location: "Bhawani Singh Rd", pricePerNight: 35000, rating: 4.9, amenities: ["Heritage", "Spa", "Pool"], distanceFromCenter: 4, imageUrl: "https://images.unsplash.com/photo-1542314831-c6a4d140f61f?auto=format&fit=crop&w=400&q=80", lat: 26.8967, lon: 75.8080 },
    { id: "h-j-2", name: "Fairmont", location: "Kukas", pricePerNight: 18000, rating: 4.7, amenities: ["Pool", "Spa", "Gym"], distanceFromCenter: 15, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80", lat: 27.0263, lon: 75.8872 },
    { id: "h-j-3", name: "ITC Rajputana", location: "Gopalbari", pricePerNight: 11000, rating: 4.5, amenities: ["Pool", "Multiple Restaurants", "Spa"], distanceFromCenter: 1, imageUrl: "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=400&q=80", lat: 26.9189, lon: 75.7915 },
    { id: "h-j-4", name: "Alsisar Haveli", location: "Sansar Chandra Rd", pricePerNight: 7000, rating: 4.4, amenities: ["Heritage", "Pool", "Courtyard"], distanceFromCenter: 2, imageUrl: "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?auto=format&fit=crop&w=400&q=80", lat: 26.9248, lon: 75.8037 },
    { id: "h-j-5", name: "Samode Haveli", location: "Gangapole", pricePerNight: 12000, rating: 4.6, amenities: ["Boutique", "Pool", "Spa"], distanceFromCenter: 5, imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=400&q=80", lat: 26.9363, lon: 75.8340 },
  ],
};

function generateDeterministicHotels(destination: string, centerLat: number, centerLon: number): Hotel[] {
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = (hash << 5) - hash + destination.charCodeAt(i);
    hash |= 0;
  }
  const basePrice = Math.abs(hash) % 15000 + 3000;
  
  const generateHotel = (idSuffix: number, nameSuffix: string, locSuffix: string, priceMod: number, dist: number, rating: number) => {
    const { dLat, dLon } = hashToOffset8km(destination + idSuffix);
    return { 
      id: `h-${hash}-${idSuffix}`, 
      name: nameSuffix, 
      location: locSuffix, 
      pricePerNight: Math.max(1500, basePrice + priceMod), 
      rating, 
      amenities: ["Pool", "Wifi", "Breakfast"], 
      distanceFromCenter: dist,
      lat: Number((centerLat + dLat).toFixed(5)),
      lon: Number((centerLon + dLon).toFixed(5)),
      imageUrl: getHotelImageUrl(nameSuffix, destination),
    };
  };

  return [
    generateHotel(1, `The Grand ${destination} Resort`, "City Center", 5000, 1, 4.7),
    generateHotel(2, `${destination} Boutique Hotel`, "North District", 0, 3, 4.4),
    generateHotel(3, `Budget Inn ${destination}`, "South Side", -3000, 8, 3.8),
    generateHotel(4, `Luxury ${destination} Villas`, "Outskirts", 10000, 12, 4.9),
    generateHotel(5, `Oasis Hotel ${destination}`, "East Side", 2000, 5, 4.2),
  ];
}

export class LocalHotelProvider {
  async searchHotels(destination: string, nights: number, budget?: number, travelers?: number): Promise<Hotel[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const key = Object.keys(seedData).find(k => k.toLowerCase() === destination.toLowerCase());
    if (key) return seedData[key];

    const coords = await resolveCoords(destination);
    const centerLat = coords?.lat || 20.5937; // fallback to center India
    const centerLon = coords?.lon || 78.9629;
    
    return generateDeterministicHotels(destination, centerLat, centerLon);
  }
}

