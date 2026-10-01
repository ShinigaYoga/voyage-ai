import { AIProvider, AIMessage } from '@/lib/ai/providers/AIProvider';
import { DestinationProfile, DestinationAttraction } from './types';
import { FIRST_PROMPT, SECOND_PROMPT } from './researchPrompt';

const STORE_NAME = 'destination_profiles';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = 'v4:';

function isValidAttractionName(name: string, destination: string): boolean {
  if (name.length < 5) return false;
  
  const stopWords = ['Morning', 'Evening', 'Local', 'City', 'Day', 'Night', 'Tour', 'Walk', 'View', 'Shopping', 'Dining', 'Experience', 'Sunset', 'Sunrise', 'Heritage', 'Traditional', 'Rooftop', 'Cafe', 'Restaurant', 'Market', 'Bazaar', 'Street', 'Road', 'Park'];
  
  const words = name.split(/\s+/);
  let hasValidProperNoun = false;
  for (const w of words) {
    if (/^[A-Z]/.test(w) && w.length >= 4) {
      const isStopWord = stopWords.some(stop => stop.toLowerCase() === w.toLowerCase());
      if (!isStopWord) {
        hasValidProperNoun = true;
        break;
      }
    }
  }

  if (!hasValidProperNoun) {
    return false;
  }
  
  const destLower = destination.toLowerCase().trim();
  const lowerName = name.toLowerCase();

  const genericPatterns = [
    new RegExp(`^${destLower} central square$`, 'i'),
    new RegExp(`^historic ${destLower} fort$`, 'i'),
    new RegExp(`^${destLower} nature reserve$`, 'i'),
    new RegExp(`^${destLower} old town$`, 'i'),
    new RegExp(`^${destLower} main market$`, 'i'),
  ];
  if (genericPatterns.some(p => p.test(name))) {
    return false;
  }
  
  if (!['jaipur', 'jodhpur', 'udaipur'].includes(destLower)) {
    if (/Sardar Market|Johari Bazaar|Hawa Mahal|Amber Fort|City Palace Jaipur/i.test(name)) {
      console.warn(`[DestinationResearchService] Soft warning: Rajasthan attraction in non-Rajasthan dest: ${name}`);
    }
  }
  
  return true;
}

function filterAttractions(attractions: DestinationAttraction[], destination: string): DestinationAttraction[] {
  return attractions.filter(a => {
    if (!a.name || typeof a.name !== 'string') return false;
    if (!isValidAttractionName(a.name, destination)) {
      console.warn('[DestinationResearchService] Filtered generic attraction:', a.name);
      return false;
    }
    return true;
  });
}

function parseJSON(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  // Strip ```json ... ``` fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  
  // Extract first {...} or [...] block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error('[parseJSON] Failed to parse JSON:', err?.message || err);
    return null;
  }
}

async function getCachedProfile(destination: string): Promise<DestinationProfile | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { getDB } = await import('@/lib/repositories/indexeddb/db');
    const db = await getDB();
    if (!db) return null;
    const result: any = await (db as any).get(STORE_NAME, CACHE_VERSION + destination.toLowerCase().trim());
    if (!result) return null;
    if (Date.now() - (result.cachedAt ?? 0) > CACHE_TTL_MS) return null;
    return result.profile as DestinationProfile;
  } catch {
    return null;
  }
}

async function setCachedProfile(profile: DestinationProfile): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { getDB } = await import('@/lib/repositories/indexeddb/db');
    const db = await getDB();
    if (!db) return;
    const record = {
      destination: CACHE_VERSION + profile.destination.toLowerCase().trim(),
      profile,
      cachedAt: Date.now(),
    };
    await (db as any).put(STORE_NAME, record);
  } catch {
    // Ignore cache write failures
  }
}

export class DestinationResearchService {
  constructor(private provider: AIProvider) {}

  async research(destination: string): Promise<DestinationProfile> {
    const normalizedDest = destination.trim();

    // 1. Check IDB cache
    const cached = await getCachedProfile(normalizedDest);
    if (cached) {
      console.log(`[DestResearch] IDB Cache HIT for: ${normalizedDest}`);
      return cached;
    }

    let profile: DestinationProfile | null = null;

    // 2. Single LLM call for destination research
    console.log(`[DestResearch] Calling LLM (provider: ${this.provider.name}) for destination: ${normalizedDest}`);
    const messages: AIMessage[] = [{ role: 'user', content: FIRST_PROMPT(normalizedDest) }];
    
    try {
      let response = await this.provider.chat(messages, []);
      console.log(`[DestResearch] Response: finishReason=${response.finishReason} error=${response.error ?? 'none'} contentLen=${response.content?.length ?? 0}`);
      
      // If response cut off by max_tokens length limit, retry once with a smaller request (8 attractions)
      if (response.finishReason === 'length') {
        console.warn(`[DestResearch] Response truncated (finishReason=length). Retrying once with smaller request (8 attractions)...`);
        const retryMessages: AIMessage[] = [{ role: 'user', content: FIRST_PROMPT(normalizedDest, 8) }];
        response = await this.provider.chat(retryMessages, []);
        console.log(`[DestResearch] Retry response: finishReason=${response.finishReason} contentLen=${response.content?.length ?? 0}`);
      }

      if (response.finishReason === 'error' || response.error) {
        console.error(`[DestResearch] Provider error during research for ${normalizedDest}:`, response.error || response.content);
      } else {
        const parsed = parseJSON(response.content || '');
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.attractions) && parsed.attractions.length > 0) {
          profile = parsed;
        } else {
          console.error(`[DestResearch] Response JSON invalid or missing attractions[] for ${normalizedDest}. Raw: ${response.content?.slice(0, 300)}`);
        }
      }
    } catch (err: any) {
      console.error(`[DestResearch] Exception during LLM research call for ${normalizedDest}:`, err?.message || err);
    }

    // Filter generic names if we received valid attractions
    if (profile && Array.isArray(profile.attractions)) {
      const beforeFilter = profile.attractions.length;
      profile.attractions = filterAttractions(profile.attractions, normalizedDest);
      console.log(`[DestResearch] After filter: ${profile.attractions.length} attractions (was ${beforeFilter}). Names: ${profile.attractions.map((a: any) => a.name).join(', ')}`);
    }

    // 3. Determine research quality
    const count = profile?.attractions?.length ?? 0;
    let researchQuality: 'full' | 'thin' | 'fallback' = 'full';
    console.log(`[DestResearch] Final attraction count for ${normalizedDest}: ${count}`);

    if (profile && count >= 8) {
      researchQuality = 'full';
    } else if (profile && count >= 3) {
      researchQuality = 'thin';
      profile.notes = 'Limited research data';
    } else {
      researchQuality = 'fallback';
      console.warn(`[DestResearch] Both providers failed or produced insufficient attractions. Using fallback profile with badge for ${normalizedDest}.`);
      profile = {
        destination: normalizedDest,
        region: '',
        category: 'mixed',
        tagline: `Explore ${normalizedDest}`,
        bestSeason: 'Year-round',
        avgCostPerDayINR: 2500,
        idealDurationDays: 3,
        hubs: [{
          name: normalizedDest,
          description: `Central ${normalizedDest}`,
          typicalStayDays: 1,
          highlights: [],
          coordinates: { lat: 0, lon: 0 }
        }],
        attractions: [
          { name: `${normalizedDest} City Center Walk`, hub: normalizedDest, category: 'culture', description: 'Explore main streets and landmarks.', entryFeeINR: 0, durationMinutes: 90, coordinates: { lat: 0, lon: 0 }, popularityScore: 10 },
          { name: `${normalizedDest} Central Market`, hub: normalizedDest, category: 'shopping', description: 'Local market with crafts and produce.', entryFeeINR: 0, durationMinutes: 60, coordinates: { lat: 0, lon: 0 }, popularityScore: 10 },
          { name: `${normalizedDest} Local Cuisine`, hub: normalizedDest, category: 'food', description: 'Try regional specialties.', entryFeeINR: 500, durationMinutes: 75, coordinates: { lat: 0, lon: 0 }, popularityScore: 10 },
          { name: `${normalizedDest} Old Town`, hub: normalizedDest, category: 'culture', description: 'Historic quarter and heritage buildings.', entryFeeINR: 0, durationMinutes: 90, coordinates: { lat: 0, lon: 0 }, popularityScore: 10 }
        ],
        localCuisine: [],
        transportModes: [],
        notes: 'Limited research data',
        researchedAt: Date.now(),
        researchQuality: 'fallback',
        expansionAttempted: false
      };
    }

    // 5. Normalise hub names: ensure each attraction.hub matches a real hub (case-insensitive)
    const hubNameMap: Record<string, string> = {};
    for (const hub of profile.hubs || []) {
      hubNameMap[hub.name.toLowerCase().trim()] = hub.name;
    }
    // If no hubs, synthesise one from the destination
    if (!profile.hubs || profile.hubs.length === 0) {
      profile.hubs = [{
        name: normalizedDest,
        description: normalizedDest,
        typicalStayDays: profile.idealDurationDays || 3,
        highlights: [],
        coordinates: { lat: 0, lon: 0 },
      }];
      hubNameMap[normalizedDest.toLowerCase()] = normalizedDest;
    }
    // Snap each attraction's hub to the nearest real hub name
    profile.attractions = profile.attractions.map((a: DestinationAttraction) => {
      const canonical = hubNameMap[a.hub?.toLowerCase().trim()];
      return canonical ? { ...a, hub: canonical } : { ...a, hub: profile!.hubs[0].name };
    });

    // 6. Determine quality and cache
    profile.researchedAt = Date.now();
    profile.researchQuality = researchQuality;
    profile.expansionAttempted = false;

    await setCachedProfile(profile);
    return profile;
  }
}
