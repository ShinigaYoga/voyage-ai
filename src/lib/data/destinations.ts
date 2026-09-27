export interface Attraction {
  name: string;
  desc: string;
  image: string; // Emoji for now to keep it lightweight
}

export interface DestinationMetadata {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  trails: number;
  type: "beach" | "mountain" | "lake" | "heritage" | "city";
  categories: string[];
  image: string; // Emoji
  description: string;
  bestSeason: string;
  avgCostPerDay: string;
  idealDuration: string;
  attractions: Attraction[];
  heroBg: string; // CSS gradient class
  heroIllustration: "mountain" | "beach" | "heritage" | "lake" | "default";
  quickFacts: { label: string; value: string }[];
  transportModes: { mode: string; desc: string }[];
  bestTime: { months: string; reason: string };
}

export const DESTINATIONS: DestinationMetadata[] = [
  {
    id: "goa",
    slug: "goa",
    name: "Goa Coastal",
    tagline: "Secret coves & night markets",
    trails: 14,
    type: "beach",
    categories: ["Beaches", "Nightlife"],
    image: "🌴",
    description: "Sun-drenched beaches, Portuguese colonial architecture, and a vibrant nightlife scene make Goa the perfect tropical escape.",
    bestSeason: "Nov - Feb",
    avgCostPerDay: "₹4,000",
    idealDuration: "4-5 Days",
    heroBg: "from-amber-200 to-orange-400",
    heroIllustration: "beach",
    quickFacts: [
      { label: "Vibe", value: "Laid-back & Tropical" },
      { label: "Famous for", value: "Seafood & Sunsets" }
    ],
    transportModes: [
      { mode: "Scooter", desc: "Best way to explore narrow coastal roads." },
      { mode: "Taxi", desc: "Available but negotiate before boarding." }
    ],
    bestTime: { months: "November to February", reason: "Pleasant weather, ideal for beach hopping and parties." },
    attractions: [
      { name: "Palolem Beach", desc: "A beautiful crescent-shaped beach known for its calm waters and silent noise parties.", image: "🏖️" },
      { name: "Basilica of Bom Jesus", desc: "A UNESCO World Heritage site and an iconic monument of Portuguese architecture.", image: "⛪" },
      { name: "Dudhsagar Falls", desc: "A spectacular four-tiered waterfall on the Mandovi River, best visited post-monsoon.", image: "🌊" },
      { name: "Anjuna Flea Market", desc: "A bustling weekly market offering everything from spices to souvenirs and live music.", image: "🛍️" },
    ]
  },
  {
    id: "kerala",
    slug: "kerala",
    name: "Kerala Lakes",
    tagline: "Houseboats & spice hills",
    trails: 8,
    type: "lake",
    categories: ["Lakeside", "Beaches"],
    image: "🛶",
    description: "Navigate serene backwaters, explore spice plantations, and relax on pristine beaches in 'God's Own Country'.",
    bestSeason: "Sep - Mar",
    avgCostPerDay: "₹5,000",
    idealDuration: "5-7 Days",
    heroBg: "from-emerald-300 to-teal-500",
    heroIllustration: "lake",
    quickFacts: [
      { label: "Vibe", value: "Serene & Lush" },
      { label: "Famous for", value: "Ayurveda & Houseboats" }
    ],
    transportModes: [
      { mode: "Houseboat", desc: "Essential for the backwater experience." },
      { mode: "Auto Rickshaw", desc: "Great for short distances in towns." }
    ],
    bestTime: { months: "September to March", reason: "Comfortable climate, right after the heavy monsoons." },
    attractions: [
      { name: "Alleppey Backwaters", desc: "Cruise through an intricate network of palm-fringed canals on a traditional houseboat.", image: "🚤" },
      { name: "Munnar Tea Gardens", desc: "Rolling hills covered with sprawling tea estates, offering a cool climate and scenic views.", image: "🍃" },
      { name: "Fort Kochi", desc: "A historic town known for its colonial charm and iconic Chinese fishing nets.", image: "🎣" },
    ]
  },
  {
    id: "manali",
    slug: "manali",
    name: "Manali Peaks",
    tagline: "Pine ridges & river camps",
    trails: 22,
    type: "mountain",
    categories: ["Hikes & Trails", "Cozy Cabins"],
    image: "🏔️",
    description: "A high-altitude Himalayan resort town renowned for its breathtaking scenery, adventure sports, and cozy atmosphere.",
    bestSeason: "Oct - Jun",
    avgCostPerDay: "₹3,500",
    idealDuration: "4-6 Days",
    heroBg: "from-sky-200 to-blue-400",
    heroIllustration: "mountain",
    quickFacts: [
      { label: "Vibe", value: "Adventurous & Chill" },
      { label: "Famous for", value: "Snow & Cafes" }
    ],
    transportModes: [
      { mode: "Local Bus", desc: "Cheap way to reach nearby valleys." },
      { mode: "Walking", desc: "Ideal for exploring Old Manali." }
    ],
    bestTime: { months: "October to June", reason: "Snow in winter, pleasant escapes in summer." },
    attractions: [
      { name: "Solang Valley", desc: "A paradise for adventure lovers, offering paragliding, skiing, and zorbing.", image: "🪂" },
      { name: "Rohtang Pass", desc: "A spectacular high mountain pass that connects the Kullu Valley with the Lahaul and Spiti Valleys.", image: "⛰️" },
      { name: "Hadimba Temple", desc: "An ancient cave temple dedicated to Hidimbi Devi, surrounded by a dense cedar forest.", image: "⛩️" },
      { name: "Old Manali", desc: "A laid-back area with charming cafes, apple orchards, and a bohemian vibe.", image: "☕" },
    ]
  },
  {
    id: "jaipur",
    slug: "jaipur",
    name: "Jaipur Stone",
    tagline: "Forts & bazaars",
    trails: 12,
    type: "heritage",
    categories: ["Heritage", "Nightlife"],
    image: "🏰",
    description: "The 'Pink City' of India, offering a majestic blend of magnificent forts, opulent palaces, and vibrant local markets.",
    bestSeason: "Oct - Mar",
    avgCostPerDay: "₹4,500",
    idealDuration: "3-4 Days",
    heroBg: "from-rose-200 to-pink-400",
    heroIllustration: "heritage",
    quickFacts: [
      { label: "Vibe", value: "Royal & Vibrant" },
      { label: "Famous for", value: "Forts & Handicrafts" }
    ],
    transportModes: [
      { mode: "E-Rickshaw", desc: "Eco-friendly way to navigate the Pink City." },
      { mode: "Metro", desc: "Clean and fast for longer cross-city trips." }
    ],
    bestTime: { months: "October to March", reason: "Cooler days perfect for sightseeing and fort explorations." },
    attractions: [
      { name: "Amer Fort", desc: "A stunning hilltop fort complex built with red sandstone and marble, overlooking Maota Lake.", image: "🐘" },
      { name: "Hawa Mahal", desc: "The 'Palace of Winds', a unique five-story structure with an intricately honeycombed hive facade.", image: "🌬️" },
      { name: "City Palace", desc: "A spectacular complex of courtyards, gardens, and buildings blending Rajasthani and Mughal architecture.", image: "👑" },
      { name: "Johari Bazaar", desc: "A bustling market famous for its exquisite traditional jewelry and vibrant textiles.", image: "💍" },
    ]
  }
];

// Helper to find a destination by slug or ID
export const getDestinationBySlug = (slug: string) => {
  return DESTINATIONS.find(d => d.slug.toLowerCase() === slug.toLowerCase() || d.id.toLowerCase() === slug.toLowerCase());
};

export const searchDestinations = (query: string) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  
  return DESTINATIONS.filter(d => 
    d.name.toLowerCase().includes(lowerQuery) ||
    d.tagline.toLowerCase().includes(lowerQuery) ||
    d.categories.some(c => c.toLowerCase().includes(lowerQuery)) ||
    d.type.toLowerCase().includes(lowerQuery)
  );
};
