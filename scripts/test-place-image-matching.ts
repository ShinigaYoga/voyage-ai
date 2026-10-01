/**
 * Unit tests for place image match-validation logic.
 * Validates that the token-overlap function correctly accepts/rejects matches.
 *
 * Run with: npx -y tsx --tsconfig tsconfig.json scripts/test-place-image-matching.ts
 */

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

function tokenOverlap(query: string, candidate: string): number {
  const t1 = makeTokens(query);
  const t2 = makeTokens(candidate);
  if (t1.size === 0 || t2.size === 0) return 0;
  let shared = 0;
  for (const tok of t1) { if (t2.has(tok)) shared++; }
  return shared / Math.min(t1.size, t2.size);
}

const THRESHOLD = 0.5;


function shouldAccept(name: string, candidateTitle: string): boolean {
  return tokenOverlap(name, candidateTitle) >= THRESHOLD;
}

const tests = [
  // Exact matches
  { name: "Taj Mahal", candidate: "Taj Mahal", expectAccept: true },
  { name: "Agra Fort", candidate: "Agra Fort", expectAccept: true },
  { name: "Rambagh Palace", candidate: "Rambagh Palace Hotel", expectAccept: true },
  // Partial matches above threshold
  { name: "Fushimi Inari Shrine", candidate: "Fushimi Inari-taisha", expectAccept: true },
  { name: "Hoi An Ancient Town", candidate: "Hoi An", expectAccept: true },
  // Mismatches – must be rejected
  { name: "Taj Mahal", candidate: "India Gate", expectAccept: false },
  { name: "Agra Fort", candidate: "Red Fort Delhi", expectAccept: false },
  { name: "Rambagh Palace", candidate: "Pink City Jaipur", expectAccept: false },
  { name: "Eiffel Tower", candidate: "Arc de Triomphe", expectAccept: false },
  // Empty/short
  { name: "Beach", candidate: "Baga Beach Goa", expectAccept: false }, // "beach" only 1 word <2 chars filtered
  { name: "Goa Beach Market", candidate: "Anjuna Flea Market", expectAccept: false },
];

let passed = 0;
let failed = 0;

console.log("=== Place Image Match Validation Tests ===\n");

for (const t of tests) {
  const result = shouldAccept(t.name, t.candidate);
  const ok = result === t.expectAccept;
  const overlap = tokenOverlap(t.name, t.candidate).toFixed(2);
  const status = ok ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} | "${t.name}" vs "${t.candidate}" | overlap=${overlap} | expected ${t.expectAccept ? "ACCEPT" : "REJECT"}, got ${result ? "ACCEPT" : "REJECT"}`);
  if (ok) passed++; else failed++;
}

console.log(`\n${passed}/${tests.length} passed`);
if (failed > 0) process.exit(1);
