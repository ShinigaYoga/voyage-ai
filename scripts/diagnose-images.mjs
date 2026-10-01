/**
 * dev-only diagnostic: mirrors /api/place-image lookup (Stages A-E).
 * Run: node scripts/diagnose-images.mjs
 */

const PLACE_STOPWORDS = new Set([
  "fort", "palace", "beach", "temple", "garden", "park", "lake", "hill",
  "museum", "market", "gate", "house", "tower", "church", "mosque", "shrine",
  "resort", "hotel", "falls", "waterfall", "forest", "valley", "island",
  "bay", "cave", "point", "peak", "ridge", "square", "road", "street",
  "river", "pass", "springs", "hot", "sanctuary", "national", "viewpoint"
]);

function makeTokens(str) {
  return new Set(str.toLowerCase().split(/[\s,\-\(\)\.]+/).filter(w => w.length > 1 && !PLACE_STOPWORDS.has(w)));
}
function makeRawTokens(str) {
  return new Set(str.toLowerCase().split(/[\s,\-\(\)\.]+/).filter(w => w.length > 1));
}
function tokenOverlap(query, candidate) {
  const t1 = makeTokens(query), t2 = makeTokens(candidate);
  if (t1.size > 0 && t2.size > 0) {
    let shared = 0;
    for (const tok of t1) if (t2.has(tok)) shared++;
    return shared / Math.min(t1.size, t2.size);
  }
  if (t1.size === 0) return 0;
  const t2raw = makeRawTokens(candidate);
  if (t2raw.size === 0) return 0;
  let shared = 0;
  for (const tok of t1) if (t2raw.has(tok)) shared++;
  return shared / Math.min(t1.size, t2raw.size);
}

async function searchWikipedia(queryStr) {
  const q = encodeURIComponent(queryStr);
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=800&generator=search&gsrsearch=${q}&gsrlimit=8&origin=*`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return Object.values((await res.json())?.query?.pages || {});
  } catch { return []; }
}

async function fetchByTitle(title) {
  const e = encodeURIComponent(title);
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=800&titles=${e}&origin=*`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const pages = Object.values((await res.json())?.query?.pages || {});
    const page = pages[0];
    if (!page || page.pageid < 0) return null;
    return (page.original?.source || page.thumbnail?.source) ? page : null;
  } catch { return null; }
}

async function prefixSearchWikipedia(prefix) {
  try {
    const e = encodeURIComponent(prefix);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=prefixsearch&pssearch=${e}&pslimit=5&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const titles = ((await res.json())?.query?.prefixsearch || []).map(r => r.title);
    if (!titles.length) return [];
    const te = encodeURIComponent(titles.join("|"));
    const res2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=800&titles=${te}&origin=*`, { signal: AbortSignal.timeout(5000) });
    if (!res2.ok) return [];
    return Object.values((await res2.json())?.query?.pages || {}).filter(p => (p.original?.source || p.thumbnail?.source) && p.pageid > 0);
  } catch { return []; }
}

async function lookupImage(name, destination) {
  const strippedName = Array.from(makeTokens(name)).join(" ");
  const queries = [
    `${name} ${destination}`,
    strippedName && strippedName !== name.toLowerCase() ? `${strippedName} ${destination}` : null,
    name,
  ].filter(Boolean);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🔍 "${name}" @ ${destination} | stripped="${strippedName}"`);

  let bestMatch = null, bestOverlap = 0, bestStage = null;

  // Stages A-C
  for (const q of queries) {
    const candidates = await searchWikipedia(q);
    console.log(`   [search] "${q}" → [${candidates.map(p => `"${p.title}"`).join(", ") || "none"}]`);
    for (const page of candidates) {
      if (!(page.original?.source || page.thumbnail?.source)) continue;
      const overlap = tokenOverlap(name, page.title);
      if (overlap > bestOverlap) { bestOverlap = overlap; bestMatch = page; bestStage = `search:"${q}"`; }
    }
    if (bestOverlap >= 0.5) break;
  }

  // Stage D: direct title
  if (!bestMatch || bestOverlap === 0) {
    for (const title of [name, strippedName].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i)) {
      const page = await fetchByTitle(title);
      if (page) {
        const overlap = tokenOverlap(name, page.title);
        console.log(`   [direct] "${title}" → "${page.title}" overlap=${overlap.toFixed(2)}`);
        if (overlap > bestOverlap) { bestOverlap = overlap; bestMatch = page; bestStage = `direct:"${title}"`; }
        if (bestOverlap >= 0.5) break;
      } else {
        console.log(`   [direct] "${title}" → not found`);
      }
    }
  }

  // Stage E: prefix search
  if (!bestMatch || bestOverlap === 0) {
    for (const prefix of [name, strippedName].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i)) {
      const candidates = await prefixSearchWikipedia(prefix);
      console.log(`   [prefix] "${prefix}" → [${candidates.map(p => `"${p.title}"`).join(", ") || "none"}]`);
      for (const page of candidates) {
        const overlap = tokenOverlap(name, page.title);
        if (overlap > bestOverlap) { bestOverlap = overlap; bestMatch = page; bestStage = `prefix:"${prefix}"`; }
      }
      if (bestOverlap >= 0.5) break;
    }
  }

  if (!bestMatch || bestOverlap === 0) {
    console.log(`   ❌ REJECTED`);
    return { name, result: null };
  }
  const imgUrl = bestMatch.original?.source || bestMatch.thumbnail?.source;
  console.log(`   ✅ ACCEPTED — "${bestMatch.title}" (overlap=${bestOverlap.toFixed(2)}) via ${bestStage}`);
  console.log(`   📸 ${imgUrl?.slice(0, 80)}...`);
  return { name, result: bestMatch.title, overlap: bestOverlap };
}

const TEST_CASES = [
  ["Khajjiar Lake", "Manali"],
  ["Manu Temple", "Manali"],
  ["Sattal Lake", "Manali"],
  ["Mall Road", "Manali"],
  ["Rohtang Pass", "Manali"],
];

async function main() {
  console.log("=== place-image Diagnostic (Stages A-E) ===");
  const results = [];
  for (const [name, dest] of TEST_CASES) results.push(await lookupImage(name, dest));
  const hits = results.filter(r => r.result).length;
  console.log(`\n${"═".repeat(60)}\n📊 SUMMARY: ${hits}/${results.length} matched\n`);
  for (const r of results) {
    const icon = r.result ? "✅" : "❌";
    const detail = r.result ? `→ "${r.result}" (overlap=${r.overlap?.toFixed(2)})` : `→ PLACEHOLDER`;
    console.log(`  ${icon} "${r.name}" ${detail}`);
  }
}
main().catch(console.error);
