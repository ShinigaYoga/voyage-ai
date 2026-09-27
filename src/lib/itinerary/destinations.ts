import { DestinationCategory, DestinationProfile, DESTINATION_PROFILES } from './profiles';

// Destination → category mapping (keyword-based, case-insensitive)
const DESTINATION_MAP: Array<{ keywords: string[]; category: DestinationCategory }> = [
  { keywords: ['goa', 'kovalam', 'varkala', 'pondicherry', 'pondichéry', 'puri', 'diu', 'tarkarli', 'alibaug', 'mahabalipuram'], category: 'beach' },
  { keywords: ['manali', 'shimla', 'mussoorie', 'darjeeling', 'ooty', 'coorg', 'kodaikanal', 'spiti', 'leh', 'ladakh', 'sikkim', 'nainital', 'rishikesh', 'mcleod', 'kullu', 'auli', 'chopta', 'kedarnath', 'badrinath', 'gangotri'], category: 'mountain' },
  { keywords: ['jaipur', 'agra', 'varanasi', 'rajasthan', 'udaipur', 'jodhpur', 'pushkar', 'hampi', 'mysore', 'mysuru', 'khajuraho', 'madhya pradesh', 'orchha', 'gwalior', 'bikaner', 'fatehpur sikri', 'delhi', 'lucknow', 'amritsar', 'chandigarh', 'bhopal', 'patna', 'bodh gaya', 'ajmer'], category: 'heritage' },
  { keywords: ['kerala', 'alleppey', 'alappuzha', 'kumarakom', 'munnar', 'kochi', 'thrissur', 'kollam'], category: 'backwater' },
  { keywords: ['mumbai', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'surat', 'indore', 'nagpur', 'visakhapatnam', 'vizag', 'kochi', 'bhubaneswar'], category: 'city' },
];

// Preference keywords → category inference
const PREFERENCE_MAP: Array<{ keywords: string[]; category: DestinationCategory }> = [
  { keywords: ['beach', 'sea', 'ocean', 'surf', 'snorkel', 'scuba', 'swim', 'coast', 'sand'], category: 'beach' },
  { keywords: ['mountain', 'trek', 'trekking', 'hiking', 'hike', 'summit', 'camp', 'camping', 'alpine', 'snowfall', 'snow'], category: 'mountain' },
  { keywords: ['heritage', 'fort', 'palace', 'temple', 'history', 'museum', 'architecture', 'ruins', 'monument', 'rajput', 'mughal'], category: 'heritage' },
  { keywords: ['backwater', 'houseboat', 'canoe', 'river', 'wetland', 'lagoon', 'spice', 'ayurveda'], category: 'backwater' },
  { keywords: ['city', 'urban', 'nightlife', 'cafe', 'shopping', 'street food', 'rooftop', 'metro', 'food tour'], category: 'city' },
];

export function getDestinationProfile(destination: string, preferences?: string[]): DestinationProfile {
  const dest = destination.toLowerCase();

  // 1. Try exact/keyword match on destination name
  for (const mapping of DESTINATION_MAP) {
    if (mapping.keywords.some(kw => dest.includes(kw))) {
      return DESTINATION_PROFILES[mapping.category];
    }
  }

  // 2. Infer from preferences
  if (preferences && preferences.length > 0) {
    const prefStr = preferences.join(' ').toLowerCase();
    for (const pref of PREFERENCE_MAP) {
      if (pref.keywords.some(kw => prefStr.includes(kw))) {
        return DESTINATION_PROFILES[pref.category];
      }
    }
  }

  // 3. Default: city profile
  return DESTINATION_PROFILES['city'];
}

/** Deterministic seed: same destination+dates → same itinerary */
export function hashSeed(destination: string, dates?: string): number {
  const str = (destination + (dates || '')).toLowerCase();
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // Keep unsigned 32-bit
  }
  return hash;
}
