import { Restaurant } from "../types";

const seedData: Record<string, Restaurant[]> = {
  Goa: [
    { id: "r-g-1", name: "Gunpowder", cuisine: ["South Indian", "Goan"], priceRange: "₹₹", rating: 4.6, signatureDishes: ["Kerala Beef Curry", "Appam"], location: "Assagao", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80" },
    { id: "r-g-2", name: "Thalassa", cuisine: ["Greek", "Mediterranean"], priceRange: "₹₹₹", rating: 4.5, signatureDishes: ["Moussaka", "Souvlaki"], location: "Siolim", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
    { id: "r-g-3", name: "Vinayak Family Restaurant", cuisine: ["Goan", "Seafood"], priceRange: "₹", rating: 4.7, signatureDishes: ["Fish Thali", "Prawn Fry"], location: "Assagao", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80" },
    { id: "r-g-4", name: "Artjuna", cuisine: ["Cafe", "Healthy"], priceRange: "₹₹", rating: 4.4, signatureDishes: ["Shakshuka", "Smoothie Bowls"], location: "Anjuna", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80" },
    { id: "r-g-5", name: "Fisherman's Wharf", cuisine: ["Goan", "Seafood", "Continental"], priceRange: "₹₹₹", rating: 4.3, signatureDishes: ["Goan Fish Curry", "Crab Masala"], location: "Cavelossim", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
  ],
  Kerala: [
    { id: "r-k-1", name: "Paragon", cuisine: ["Kerala", "Indian"], priceRange: "₹₹", rating: 4.8, signatureDishes: ["Chicken Biryani", "Fish Mango Curry"], location: "Kochi", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80" },
    { id: "r-k-2", name: "Villa Maya", cuisine: ["Continental", "Kerala"], priceRange: "₹₹₹", rating: 4.7, signatureDishes: ["Stuffed Crab", "Tikka"], location: "Trivandrum", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
    { id: "r-k-3", name: "Dhe Puttu", cuisine: ["Kerala"], priceRange: "₹", rating: 4.4, signatureDishes: ["Puttu", "Kadala Curry"], location: "Edappally", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80" },
    { id: "r-k-4", name: "Fort House Restaurant", cuisine: ["Kerala", "Seafood"], priceRange: "₹₹", rating: 4.5, signatureDishes: ["Pork Vindaloo", "Kerala Fish Curry"], location: "Fort Kochi", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80" },
    { id: "r-k-5", name: "Grand Pavilion", cuisine: ["Indian", "Kerala"], priceRange: "₹₹", rating: 4.6, signatureDishes: ["Karimeen Pollichathu", "Chicken Roast"], location: "Ernakulam", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
  ],
  Manali: [
    { id: "r-m-1", name: "Johnson's Cafe", cuisine: ["Continental", "Indian"], priceRange: "₹₹", rating: 4.5, signatureDishes: ["Trout Fish", "Wood Fired Pizza"], location: "Circuit House Road", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80" },
    { id: "r-m-2", name: "Cafe 1947", cuisine: ["Italian", "Cafe"], priceRange: "₹₹", rating: 4.6, signatureDishes: ["Burger", "Pasta", "Coffee"], location: "Old Manali", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
    { id: "r-m-3", name: "Chopsticks", cuisine: ["Tibetan", "Chinese"], priceRange: "₹", rating: 4.3, signatureDishes: ["Momos", "Thukpa"], location: "Mall Road", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80" },
    { id: "r-m-4", name: "The Lazy Dog", cuisine: ["Asian", "Continental"], priceRange: "₹₹", rating: 4.4, signatureDishes: ["Sushi", "Pad Thai"], location: "Old Manali", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80" },
    { id: "r-m-5", name: "Fat Plate Cafe", cuisine: ["Continental", "Indian"], priceRange: "₹₹₹", rating: 4.7, signatureDishes: ["Roast Chicken", "Brownie"], location: "Shuru", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
  ],
  Jaipur: [
    { id: "r-j-1", name: "Chokhi Dhani", cuisine: ["Rajasthani"], priceRange: "₹₹", rating: 4.5, signatureDishes: ["Dal Bati Churma", "Gatte Ki Sabzi"], location: "Tonk Road", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80" },
    { id: "r-j-2", name: "Suvarna Mahal", cuisine: ["Indian", "Rajasthani"], priceRange: "₹₹₹", rating: 4.8, signatureDishes: ["Laal Maas", "Murgh Khud"], location: "Rambagh Palace", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" },
    { id: "r-j-3", name: "Laxmi Mishthan Bhandar (LMB)", cuisine: ["Indian Sweets", "Vegetarian"], priceRange: "₹", rating: 4.2, signatureDishes: ["Ghevar", "Kachori"], location: "Johari Bazaar", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=400&q=80" },
    { id: "r-j-4", name: "Peacock Rooftop Restaurant", cuisine: ["Indian", "Continental"], priceRange: "₹₹", rating: 4.6, signatureDishes: ["Tandoori Platter", "Naan"], location: "Hathroi Fort", imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80" },
    { id: "r-j-5", name: "Tapri Central", cuisine: ["Cafe", "Indian Snacks"], priceRange: "₹₹", rating: 4.5, signatureDishes: ["Vada Pav", "Masala Chai"], location: "C Scheme", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80" },
  ],
};

function generateDeterministicRestaurants(destination: string): Restaurant[] {
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = (hash << 5) - hash + destination.charCodeAt(i);
    hash |= 0;
  }
  
  return [
    { id: `r-${hash}-1`, name: `The Local Fork ${destination}`, cuisine: ["Local", "Continental"], priceRange: "₹₹", rating: 4.5, signatureDishes: ["Special Curry", "Grilled Fish"], location: "City Center" },
    { id: `r-${hash}-2`, name: `${destination} Spice House`, cuisine: ["Indian"], priceRange: "₹₹₹", rating: 4.7, signatureDishes: ["Biryani", "Kebabs"], location: "North District" },
    { id: `r-${hash}-3`, name: `Quick Bites ${destination}`, cuisine: ["Street Food"], priceRange: "₹", rating: 4.1, signatureDishes: ["Snacks", "Tea"], location: "Market Area" },
    { id: `r-${hash}-4`, name: `Cafe ${destination}`, cuisine: ["Cafe", "Desserts"], priceRange: "₹₹", rating: 4.6, signatureDishes: ["Coffee", "Cheesecake"], location: "South Side" },
    { id: `r-${hash}-5`, name: `Royal Feast ${destination}`, cuisine: ["Fine Dining", "International"], priceRange: "₹₹₹", rating: 4.8, signatureDishes: ["Steak", "Wine Pairing"], location: "Uptown" },
  ];
}

export class LocalRestaurantProvider {
  async searchRestaurants(destination: string, cuisine?: string, budget?: string): Promise<Restaurant[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const key = Object.keys(seedData).find(k => k.toLowerCase() === destination.toLowerCase());
    let results = key ? seedData[key] : generateDeterministicRestaurants(destination);
    
    if (cuisine) {
      const q = cuisine.toLowerCase();
      results = results.filter(r => r.cuisine.some(c => c.toLowerCase().includes(q)));
    }
    
    return results;
  }
}
