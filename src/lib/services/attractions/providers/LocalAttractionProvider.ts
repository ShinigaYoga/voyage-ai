import { Attraction } from "../types";

const seedData: Record<string, Attraction[]> = {
  Goa: [
    { id: "a-g-1", name: "Baga Beach", category: "beach", description: "Famous for its water sports, shacks, and nightlife.", entryFee: 0, durationMinutes: 180, location: "North Goa", imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
    { id: "a-g-2", name: "Aguada Fort", category: "fort", description: "A well-preserved 17th-century Portuguese fort standing on Sinquerim Beach.", entryFee: 50, durationMinutes: 90, location: "Candolim", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80", rating: 4.6 },
    { id: "a-g-3", name: "Basilica of Bom Jesus", category: "temple", description: "A UNESCO World Heritage Site in Old Goa, known for holding the mortal remains of St. Francis Xavier.", entryFee: 0, durationMinutes: 60, location: "Old Goa", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
    { id: "a-g-4", name: "Dudhsagar Waterfalls", category: "nature", description: "A majestic four-tiered waterfall located on the Mandovi River.", entryFee: 400, durationMinutes: 240, location: "Sanguem", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80", rating: 4.7 },
    { id: "a-g-5", name: "Anjuna Flea Market", category: "market", description: "A vibrant weekly market offering clothes, jewelry, and souvenirs.", entryFee: 0, durationMinutes: 120, location: "Anjuna", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", rating: 4.3 },
  ],
  Kerala: [
    { id: "a-k-1", name: "Alleppey Backwaters", category: "nature", description: "Famous for houseboat cruises and tranquil scenic views.", entryFee: 0, durationMinutes: 300, location: "Alappuzha", imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80", rating: 4.9 },
    { id: "a-k-2", name: "Munnar Tea Gardens", category: "nature", description: "Lush green tea plantations spanning across hills.", entryFee: 100, durationMinutes: 180, location: "Munnar", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
    { id: "a-k-3", name: "Fort Kochi", category: "fort", description: "Historic area known for its Portuguese, Dutch, and British colonial architecture.", entryFee: 0, durationMinutes: 120, location: "Kochi", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", rating: 4.6 },
    { id: "a-k-4", name: "Periyar National Park", category: "nature", description: "A renowned elephant and tiger reserve.", entryFee: 450, durationMinutes: 240, location: "Thekkady", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80", rating: 4.7 },
    { id: "a-k-5", name: "Varkala Beach", category: "beach", description: "A beautiful beach known for its dramatic cliff backdrop.", entryFee: 0, durationMinutes: 150, location: "Varkala", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
  ],
  Manali: [
    { id: "a-m-1", name: "Rohtang Pass", category: "nature", description: "A high mountain pass offering stunning snow views.", entryFee: 500, durationMinutes: 300, location: "Rohtang", imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
    { id: "a-m-2", name: "Solang Valley", category: "nature", description: "Famous for adventure sports like paragliding and skiing.", entryFee: 0, durationMinutes: 240, location: "Solang", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80", rating: 4.7 },
    { id: "a-m-3", name: "Hadimba Temple", category: "temple", description: "An ancient cave temple dedicated to Hidimbi Devi.", entryFee: 0, durationMinutes: 60, location: "Dhungri", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", rating: 4.6 },
    { id: "a-m-4", name: "Manu Temple", category: "temple", description: "A historic temple dedicated to sage Manu.", entryFee: 0, durationMinutes: 45, location: "Old Manali", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80", rating: 4.4 },
    { id: "a-m-5", name: "Mall Road", category: "market", description: "The bustling heart of Manali, full of shops and eateries.", entryFee: 0, durationMinutes: 120, location: "City Center", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
  ],
  Jaipur: [
    { id: "a-j-1", name: "Amer Fort", category: "fort", description: "A majestic hillside fort known for its artistic Hindu style elements.", entryFee: 500, durationMinutes: 180, location: "Amer", imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80", rating: 4.9 },
    { id: "a-j-2", name: "Hawa Mahal", category: "fort", description: "The Palace of Winds, an iconic pink sandstone structure.", entryFee: 200, durationMinutes: 60, location: "Badi Choupad", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80", rating: 4.7 },
    { id: "a-j-3", name: "City Palace", category: "museum", description: "A sprawling palace complex showcasing Jaipur's royal history.", entryFee: 700, durationMinutes: 150, location: "Jaleb Chowk", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
    { id: "a-j-4", name: "Jantar Mantar", category: "museum", description: "A UNESCO World Heritage site featuring astronomical instruments.", entryFee: 200, durationMinutes: 90, location: "City Palace complex", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80", rating: 4.6 },
    { id: "a-j-5", name: "Johari Bazaar", category: "market", description: "Famous market for traditional jewelry and textiles.", entryFee: 0, durationMinutes: 120, location: "Badi Choupad", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
  ],
};

function generateDeterministicAttractions(destination: string): Attraction[] {
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = (hash << 5) - hash + destination.charCodeAt(i);
    hash |= 0;
  }
  
  return [
    { id: `a-${hash}-1`, name: `${destination} Central Square`, category: "market", description: `A vibrant hub in the heart of ${destination}.`, entryFee: 0, durationMinutes: 120, location: "City Center", rating: 4.5 },
    { id: `a-${hash}-2`, name: `Historic ${destination} Fort`, category: "fort", description: "A glimpse into the ancient history of the region.", entryFee: 150, durationMinutes: 90, location: "Old Town", rating: 4.7 },
    { id: `a-${hash}-3`, name: `${destination} Nature Reserve`, category: "nature", description: "A serene getaway from the bustling city.", entryFee: 50, durationMinutes: 180, location: "Outskirts", rating: 4.6 },
    { id: `a-${hash}-4`, name: `${destination} Art Museum`, category: "museum", description: "Showcasing local and international art.", entryFee: 300, durationMinutes: 150, location: "Cultural District", rating: 4.4 },
    { id: `a-${hash}-5`, name: `The Great ${destination} Temple`, category: "temple", description: "A spiritual sanctuary with stunning architecture.", entryFee: 0, durationMinutes: 60, location: "Heritage Area", rating: 4.8 },
  ];
}

export class LocalAttractionProvider {
  async searchAttractions(destination: string, category?: string): Promise<Attraction[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const key = Object.keys(seedData).find(k => k.toLowerCase() === destination.toLowerCase());
    let results = key ? seedData[key] : generateDeterministicAttractions(destination);
    
    if (category) {
      results = results.filter(a => a.category.toLowerCase() === category.toLowerCase());
    }
    
    return results;
  }
}
