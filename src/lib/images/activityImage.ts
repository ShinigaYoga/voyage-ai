/**
 * Image utilities for activities and hotels.
 * 
 * No real image provider is configured. These functions return contextually
 * appropriate images from the Unsplash Source API (publicly free, no key required).
 * Images are illustrative and do NOT represent actual photographs of the specific
 * place or property.
 */

const CATEGORY_KEYWORDS: Record<string, string> = {
  food: 'restaurant,food,dining',
  culture: 'museum,heritage,culture,temple',
  nature: 'nature,park,landscape,outdoors',
  nightlife: 'nightlife,bar,city,lights',
  shopping: 'shopping,market,bazaar',
  rest: 'spa,wellness,resort,relaxation',
  transport: 'travel,journey,transport',
  beach: 'beach,ocean,waves',
  adventure: 'adventure,trekking,mountains',
};

/**
 * Returns an illustrative Unsplash Source URL for an activity.
 * The URL is keyword-driven using the activity category and destination context.
 */
export function getActivityImageUrl(
  name: string,
  category: string,
  destination: string
): string {
  const catKeywords = CATEGORY_KEYWORDS[category] || 'travel,tourism';
  // Use a stable seed for determinism by encoding the name
  const namePart = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const destPart = destination.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const keyword = `${catKeywords},${destPart}`;
  // Unsplash Source: /400x225/?{keywords} — public, no API key needed
  return `https://source.unsplash.com/400x225/?${encodeURIComponent(keyword)}&sig=${namePart}`;
}

/**
 * Returns an illustrative Unsplash Source URL for a hotel/accommodation.
 */
export function getHotelImageUrl(
  name: string,
  destination: string
): string {
  const namePart = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const destPart = destination.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  return `https://source.unsplash.com/400x225/?hotel,accommodation,${encodeURIComponent(destPart)}&sig=${namePart}`;
}

/**
 * Returns true if the URL is an auto-generated Unsplash Source URL
 * (as opposed to a hand-curated specific photo URL).
 */
export function isGeneratedImageUrl(url: string): boolean {
  return url.includes('source.unsplash.com');
}

/**
 * Helper to determine if an activity category is eligible to show an attraction image slot.
 * Sightseeing, culture, nature, rest, shopping, nightlife, transport, adventure are all eligible.
 * Food/Dining is NOT eligible unless a verified specific photo exists.
 */
export function isImageEligible(category?: string): boolean {
  if (!category) return true;
  const c = category.toLowerCase();
  return c !== 'food' && c !== 'restaurant' && c !== 'cafe';
}
