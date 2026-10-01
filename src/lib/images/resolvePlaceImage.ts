/**
 * resolvePlaceImage – shared server-side image resolver.
 *
 * Chain (first VERIFIED win):
 *   A) Wikimedia Commons geosearch (within 2 km of coords; name-token match)
 *   B) Wikipedia lead image, place-type gated (reject people/deities/events)
 *   C) Wikipedia full-text search (name + destination, stripped, standalone)
 *   D) Wikipedia direct-title fetch
 *   E) Wikipedia prefix-search
 *   F) No image → placeholder
 *
 * No destination/place names hardcoded. All matching derives from runtime inputs.
 * Server-side in-memory cache: positive 6 h, negative 10 min.
 */

export interface PlaceImageInput {
  name: string;
  destination: string;
  lat?: number | null;
  lng?: number | null;
  type?: "hotel" | "attraction" | string;
}

export interface PlaceImageResult {
  imageUrl?: string;
  imageAlt?: string;
  source?: string;
  attribution?: string;
  score: number; // 0-1
  reason: string;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_VERSION = "v3";
const POSITIVE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const NEGATIVE_TTL = 10 * 60 * 1000;      // 10 minutes

interface CacheEntry {
  result: PlaceImageResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(input: PlaceImageInput): string {
  return `${CACHE_VERSION}|${input.name.toLowerCase().trim()}|${input.destination.toLowerCase().trim()}`;
}

function getCached(input: PlaceImageInput): PlaceImageResult | null {
  const entry = cache.get(cacheKey(input));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(input));
    return null;
  }
  return entry.result;
}

function setCache(input: PlaceImageInput, result: PlaceImageResult) {
  const ttl = result.imageUrl ? POSITIVE_TTL : NEGATIVE_TTL;
  cache.set(cacheKey(input), { result, expiresAt: Date.now() + ttl });
  // Evict oldest entries if cache grows too large
  if (cache.size > 2000) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ─── In-flight deduplication ──────────────────────────────────────────────────

const inflight = new Map<string, Promise<PlaceImageResult>>();

// ─── Token helpers ────────────────────────────────────────────────────────────

const PLACE_STOPWORDS = new Set([
  "fort", "palace", "beach", "temple", "garden", "park", "lake", "hill",
  "museum", "market", "gate", "house", "tower", "church", "mosque", "shrine",
  "resort", "hotel", "falls", "waterfall", "forest", "valley", "island",
  "bay", "cave", "point", "peak", "ridge", "square", "road", "street",
  "river", "pass", "springs", "hot", "sanctuary", "national", "viewpoint",
  "the", "of", "and", "in", "at", "near", "old", "new", "great", "big",
]);

/** Normalize abbreviations: merge consecutive single-letter words ("M G Road" → "mg road") */
function normalizeAbbr(str: string): string {
  return str
    .replace(/\b([A-Za-z])\s+(?=[A-Za-z]\b)/g, "$1") // "M G" → "MG"
    .trim();
}

function makeTokens(str: string): Set<string> {
  return new Set(
    normalizeAbbr(str).toLowerCase().split(/[\s,\-\(\)\.\/]+/).filter(w => w.length > 1 && !PLACE_STOPWORDS.has(w))
  );
}

function makeRawTokens(str: string): Set<string> {
  return new Set(normalizeAbbr(str).toLowerCase().split(/[\s,\-\(\)\.\/]+/).filter(w => w.length > 1));
}

/**
 * Token overlap score: ignores stopwords for primary matching.
 * When the stripped query has exactly 1 token (high ambiguity, e.g. "mg"),
 * we apply a secondary raw-token consistency check: at least 1 raw query
 * token (including stopwords like "road") must appear in the candidate.
 * This prevents "MG Road" → "MG Cars" false positives.
 * Returns 0 if match is purely on stopwords.
 */
export function tokenOverlap(query: string, candidate: string): number {
  const t1 = makeTokens(query);
  const t2 = makeTokens(candidate);

  if (t1.size > 0 && t2.size > 0) {
    let shared = 0;
    for (const tok of t1) if (t2.has(tok)) shared++;
    const score = shared / Math.min(t1.size, t2.size);

    // Secondary raw-token consistency: if stripped query is 1 token (ambiguous),
    // require that at least 1 raw query token appears in raw candidate tokens.
    if (score > 0 && t1.size === 1) {
      const qRaw = makeRawTokens(query);
      const cRaw = makeRawTokens(candidate);
      const rawShared = [...qRaw].filter(t => cRaw.has(t)).length;
      if (rawShared === 0) return 0; // Reject: no raw token evidence
    }

    return score;
  }

  // Query has no meaningful tokens (all stopwords) → avoid false positives
  if (t1.size === 0) return 0;

  // Candidate all stopwords → match raw tokens
  const t2raw = makeRawTokens(candidate);
  if (t2raw.size === 0) return 0;

  let shared = 0;
  for (const tok of t1) if (t2raw.has(tok)) shared++;
  return shared / Math.min(t1.size, t2raw.size);
}

// ─── Wikipedia helpers ────────────────────────────────────────────────────────

async function wikiGet(params: Record<string, string>): Promise<any> {
  const base = "https://en.wikipedia.org/w/api.php";
  const qs = new URLSearchParams({ ...params, format: "json", origin: "*" }).toString();
  const res = await fetch(`${base}?${qs}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
  return res.json();
}

async function searchWikipedia(queryStr: string): Promise<any[]> {
  try {
    const data = await wikiGet({
      action: "query",
      prop: "pageimages",
      piprop: "original|thumbnail",
      pithumbsize: "800",
      generator: "search",
      gsrsearch: queryStr,
      gsrlimit: "8",
    });
    return Object.values(data?.query?.pages || {});
  } catch {
    return [];
  }
}

async function fetchByTitle(title: string): Promise<any | null> {
  try {
    const data = await wikiGet({
      action: "query",
      prop: "pageimages",
      piprop: "original|thumbnail",
      pithumbsize: "800",
      titles: title,
    });
    const pages = Object.values(data?.query?.pages || {}) as any[];
    const page = pages[0];
    if (!page || page.pageid < 0) return null;
    return (page.original?.source || page.thumbnail?.source) ? page : null;
  } catch {
    return null;
  }
}

async function prefixSearchWikipedia(prefix: string): Promise<any[]> {
  try {
    const data = await wikiGet({ action: "query", list: "prefixsearch", pssearch: prefix, pslimit: "5" });
    const titles: string[] = (data?.query?.prefixsearch || []).map((r: any) => r.title);
    if (!titles.length) return [];
    const data2 = await wikiGet({
      action: "query",
      prop: "pageimages",
      piprop: "original|thumbnail",
      pithumbsize: "800",
      titles: titles.join("|"),
    });
    return Object.values(data2?.query?.pages || {}).filter(
      (p: any) => (p.original?.source || p.thumbnail?.source) && p.pageid > 0
    );
  } catch {
    return [];
  }
}

// ─── Stage A: Wikimedia Commons geosearch ────────────────────────────────────

interface CommonsGeoResult {
  imageUrl: string;
  title: string;
  attribution?: string;
}

async function commonsGeosearch(
  lat: number,
  lng: number,
  name: string,
  radiusMeters = 2000
): Promise<CommonsGeoResult | null> {
  try {
    // Step 1: find nearby Commons files
    const data = await wikiGet({
      action: "query",
      list: "geosearch",
      gscoord: `${lat}|${lng}`,
      gsradius: String(radiusMeters),
      gsnamespace: "6", // File namespace
      gslimit: "20",
      gsprop: "type|name|dim|dist",
    });

    const hits: any[] = data?.query?.geosearch || [];
    if (!hits.length) return null;

    // Filter hits whose title token-overlaps with the place name
    const nameTokens = makeTokens(name);
    const candidates = hits.filter(h => {
      if (nameTokens.size === 0) return true; // accept any if name is pure stopwords
      const fileTitle = (h.title || "").replace(/^File:/i, "").replace(/\.[a-z]+$/i, "");
      const overlap = tokenOverlap(name, fileTitle);
      return overlap > 0;
    });

    // Sort by overlap score desc, then distance asc
    candidates.sort((a, b) => {
      const fileA = (a.title || "").replace(/^File:/i, "").replace(/\.[a-z]+$/i, "");
      const fileB = (b.title || "").replace(/^File:/i, "").replace(/\.[a-z]+$/i, "");
      const overlapDiff = tokenOverlap(name, fileB) - tokenOverlap(name, fileA);
      if (Math.abs(overlapDiff) > 0.05) return overlapDiff;
      return (a.dist || 9999) - (b.dist || 9999);
    });

    if (!candidates.length) return null;

    // Step 2: get actual image URL for best candidate
    const best = candidates[0];
    const data2 = await wikiGet({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "800",
      titles: best.title,
    });

    const pages = Object.values(data2?.query?.pages || {}) as any[];
    const page = pages[0];
    const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
    if (!imgUrl) return null;

    const artist = page?.imageinfo?.[0]?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") || "";
    const license = page?.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || "";
    const attribution = [artist, license].filter(Boolean).join(" · ");

    return { imageUrl: imgUrl, title: best.title, attribution };
  } catch {
    return null;
  }
}

// ─── Stage B: Wikipedia lead image with place-type guard ────────────────────

/** Categories that indicate the page is about a person, deity, or event — reject these */
const PERSON_PATTERNS = [
  /\bbirths?\b/i, /\bdeaths?\b/i, /\bpeople\b/i, /\bpersons?\b/i,
  /\bactors?\b/i, /\bsingers?\b/i, /\bpoliticians?\b/i, /\bwriters?\b/i,
  /\bauthors?\b/i, /\bdeities\b/i, /\bgods?\b/i, /\bgoddesses?\b/i,
  /\bevents?\b/i, /\bfestivals?\b/i, /\bbattles?\b/i, /\bfilms?\b/i,
  /\balive\b/i,
];

async function wikiLeadImage(name: string, destination: string): Promise<{
  page: any;
  categories: string[];
} | null> {
  try {
    // Search for the most relevant article
    const data = await wikiGet({
      action: "query",
      prop: "pageimages|categories",
      piprop: "original|thumbnail",
      pithumbsize: "800",
      cllimit: "20",
      generator: "search",
      gsrsearch: `${name} ${destination}`,
      gsrlimit: "5",
    });

    const pages: any[] = Object.values(data?.query?.pages || {});
    // Find best-matching page with an image
    let best: { page: any; overlap: number; cats: string[] } | null = null;
    for (const page of pages) {
      const imgUrl = page.original?.source || page.thumbnail?.source;
      if (!imgUrl) continue;
      const overlap = tokenOverlap(name, page.title);
      if (overlap === 0) continue;
      const cats = (page.categories || []).map((c: any) => c.title || "");
      if (!best || overlap > best.overlap) {
        best = { page, overlap, cats };
      }
    }
    if (!best) return null;
    return { page: best.page, categories: best.cats };
  } catch {
    return null;
  }
}

function isPersonOrEvent(categories: string[]): boolean {
  return categories.some(cat => PERSON_PATTERNS.some(p => p.test(cat)));
}

// ─── Nominatim geocoding (lazy) ───────────────────────────────────────────────

async function geocode(name: string, destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${name}, ${destination}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VoyageAI/1.0 (travel planning app)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.[0]) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// ─── Main resolver ────────────────────────────────────────────────────────────

async function _resolve(input: PlaceImageInput): Promise<PlaceImageResult> {
  const { name, destination, type } = input;
  let { lat, lng } = input;
  const noImage: PlaceImageResult = { score: 0, reason: "no_match" };

  // Geocode if coordinates missing (best-effort; don't fail without them)
  if (!lat || !lng) {
    const geo = await geocode(name, destination);
    if (geo) { lat = geo.lat; lng = geo.lng; }
  }

  // ── Stage A: Wikimedia Commons geosearch ──────────────────────────────────
  if (lat && lng) {
    const commons = await commonsGeosearch(lat, lng, name);
    if (commons) {
      const score = tokenOverlap(name, commons.title.replace(/^File:/i, "").replace(/\.[a-z]+$/i, ""));
      // Only accept if name tokens appear in the file title (non-zero overlap)
      if (score > 0 || makeTokens(name).size === 0) {
        return {
          imageUrl: commons.imageUrl,
          imageAlt: `${name}, ${destination}`,
          source: "Wikimedia Commons",
          attribution: commons.attribution,
          score: Math.max(score, 0.3),
          reason: "commons_geosearch",
        };
      }
    }
  }

  // ── Stage B: Wikipedia lead image (place-type gated) ─────────────────────
  const wikiLead = await wikiLeadImage(name, destination);
  if (wikiLead) {
    const { page, categories } = wikiLead;
    if (!isPersonOrEvent(categories)) {
      const overlap = tokenOverlap(name, page.title);
      if (overlap >= 0.5) {
        const imgUrl = page.original?.source || page.thumbnail?.source;
        return {
          imageUrl: imgUrl,
          imageAlt: `${page.title}, ${destination}`,
          source: "Wikipedia",
          score: overlap,
          reason: "wiki_lead_image",
        };
      }
    }
  }

  // ── Stages C-E: Wikipedia search/direct/prefix ───────────────────────────
  const strippedName = Array.from(makeTokens(name)).join(" ");
  const queries = [
    `${name} ${destination}`,
    strippedName && strippedName !== name.toLowerCase() ? `${strippedName} ${destination}` : null,
    name,
  ].filter(Boolean) as string[];

  let bestPage: any = null;
  let bestOverlap = 0;

  // Stage C: search queries
  for (const q of queries) {
    const candidates = await searchWikipedia(q);
    for (const page of candidates) {
      const imgUrl = page.original?.source || page.thumbnail?.source;
      if (!imgUrl) continue;
      const overlap = tokenOverlap(name, page.title);
      if (overlap > bestOverlap) { bestOverlap = overlap; bestPage = page; }
    }
    if (bestOverlap >= 0.5) break;
  }

  // Stage D: direct title
  if (!bestPage || bestOverlap === 0) {
    for (const title of [name, strippedName].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i)) {
      const page = await fetchByTitle(title);
      if (page) {
        const overlap = tokenOverlap(name, page.title);
        if (overlap > bestOverlap) { bestOverlap = overlap; bestPage = page; }
        if (bestOverlap >= 0.5) break;
      }
    }
  }

  // Stage E: prefix search
  if (!bestPage || bestOverlap === 0) {
    for (const prefix of [name, strippedName].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i)) {
      const candidates = await prefixSearchWikipedia(prefix);
      for (const page of candidates) {
        const overlap = tokenOverlap(name, page.title);
        if (overlap > bestOverlap) { bestOverlap = overlap; bestPage = page; }
      }
      if (bestOverlap >= 0.5) break;
    }
  }

  if (!bestPage || bestOverlap === 0) {
    console.warn(`[resolvePlaceImage] No match: "${name}" @ ${destination}`);
    return noImage;
  }

  const imgUrl = bestPage.original?.source || bestPage.thumbnail?.source;
  return {
    imageUrl: imgUrl,
    imageAlt: `${bestPage.title}, ${destination}`,
    source: "Wikipedia",
    score: bestOverlap,
    reason: "wiki_search",
  };
}

/**
 * Public API. Deduplicates in-flight requests for the same key.
 */
export async function resolvePlaceImage(input: PlaceImageInput): Promise<PlaceImageResult> {
  const cached = getCached(input);
  if (cached) return cached;

  const key = cacheKey(input);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = _resolve(input)
    .then(result => {
      setCache(input, result);
      inflight.delete(key);
      return result;
    })
    .catch(err => {
      inflight.delete(key);
      console.error(`[resolvePlaceImage] Error for "${input.name}":`, err);
      return { score: 0, reason: "error" } as PlaceImageResult;
    });

  inflight.set(key, promise);
  return promise;
}
