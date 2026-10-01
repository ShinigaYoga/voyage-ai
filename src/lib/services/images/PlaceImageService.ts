export interface PlaceImageResult {
  imageUrl?: string;
  imageAlt?: string;
  source?: string;
  confidence: number;
}

const imageCache = new Map<string, PlaceImageResult>();

const PLACE_STOPWORDS = new Set([
  "fort", "palace", "beach", "temple", "garden", "park", "lake", "hill",
  "museum", "market", "gate", "house", "tower", "church", "mosque", "shrine",
  "resort", "hotel", "falls", "waterfall", "forest", "valley", "island",
  "bay", "cave", "point", "peak", "ridge", "square", "road", "street",
]);

function makeTokens(str: string): Set<string> {
  return new Set(
    str.toLowerCase().split(/[\s,\-\(\)\.]+/).filter(w => w.length > 2 && !PLACE_STOPWORDS.has(w))
  );
}

function getTokenOverlap(str1: string, str2: string): number {
  const t1 = makeTokens(str1);
  const t2 = makeTokens(str2);
  if (t1.size === 0 || t2.size === 0) return 0;
  let intersection = 0;
  for (const token of t1) {
    if (t2.has(token)) intersection++;
  }
  return intersection / Math.min(t1.size, t2.size);
}

export class PlaceImageService {
  private inFlight = new Map<string, Promise<PlaceImageResult>>();

  private async fetchWikipediaImage(name: string, destination: string): Promise<PlaceImageResult> {
    const query = encodeURIComponent(`${name} ${destination}`);
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=800&generator=search&gsrsearch=${query}&gsrlimit=3&origin=*`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Wiki request failed");
      
      const data = await res.json();
      const pages = data?.query?.pages;
      if (!pages) return { confidence: 0 };

      // Find best match based on title overlap
      let bestMatch: any = null;
      let highestOverlap = 0;

      for (const key in pages) {
        const page = pages[key];
        const overlap = getTokenOverlap(name, page.title);
        if (overlap > highestOverlap) {
          highestOverlap = overlap;
          bestMatch = page;
        }
      }

      // Threshold check: Need at least 0.5 token overlap coefficient after stopword filtering
      if (highestOverlap < 0.5 || !bestMatch) {
        console.warn(`[PlaceImageService] Rejected Wiki match for ${name}: Highest overlap ${highestOverlap.toFixed(2)} with '${bestMatch?.title}'`);
        return { confidence: highestOverlap };
      }

      const imgUrl = bestMatch.original?.source || bestMatch.thumbnail?.source;
      if (imgUrl) {
        return {
          imageUrl: imgUrl,
          imageAlt: `${bestMatch.title}, ${destination}`,
          source: 'Wikipedia',
          confidence: highestOverlap
        };
      }
      
      return { confidence: 0 };
    } catch (error) {
      console.warn(`[PlaceImageService] Failed to fetch image for ${name}`, error);
      return { confidence: 0 };
    }
  }

  async getImage(name: string, type: 'hotel' | 'attraction', destination: string, existingUrl?: string): Promise<PlaceImageResult> {
    if (existingUrl) {
      // Don't overwrite if it already has a trusted URL (not from unsplash.com)
      if (!existingUrl.includes('source.unsplash.com')) {
        return { imageUrl: existingUrl, confidence: 1 };
      }
    }

    const key = `${name.toLowerCase().trim()}|${destination.toLowerCase().trim()}`;
    if (imageCache.has(key)) {
      return imageCache.get(key)!;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const promise = this.fetchWikipediaImage(name, destination).then(result => {
      imageCache.set(key, result);
      this.inFlight.delete(key);
      return result;
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
