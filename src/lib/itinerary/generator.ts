import { Activity, Day, Trip } from '../types';
import { DestinationProfile, DestinationAttraction } from '../services/destination/types';
import { getActivityImageUrl } from '../images/activityImage';

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = c + (c << 3) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBudget(trip: Trip, numDays: number): number {
  if (!trip.budget) return 3000;
  const match = trip.budget.replace(/[^0-9]/g, '');
  const total = parseInt(match, 10);
  if (isNaN(total)) return 3000;
  const travelers = trip.travelers || 1;
  return total / (travelers * numDays);
}

function parseDays(trip: Trip): number {
  if (!trip.dates) return 4;
  const daysMatch = trip.dates.match(/(\d+)\s*day/i);
  if (daysMatch) return Math.max(1, Math.min(14, parseInt(daysMatch[1], 10)));
  const dateRange = trip.dates.match(/(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/);
  if (dateRange) {
    const diff = (new Date(dateRange[2]).getTime() - new Date(dateRange[1]).getTime()) / 86400000;
    return Math.max(1, Math.min(14, Math.round(diff)));
  }
  return 4;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Hub allocation ───────────────────────────────────────────────────────────

function buildDailyHubs(hubs: DestinationProfile['hubs'], numDays: number): string[] {
  if (hubs.length === 0) return [];
  if (hubs.length === 1) return Array(numDays).fill(hubs[0].name);

  // Sort by typicalStayDays descending so major hubs get more time
  const sorted = [...hubs].sort((a, b) => (b.typicalStayDays || 1) - (a.typicalStayDays || 1));
  const coreHubs = sorted.length >= 5 ? sorted.slice(0, 4) : sorted;

  const dailyHubs: string[] = [];
  for (let i = 0; i < numDays; i++) {
    // Max 2 consecutive days per hub before rotating — never 3+
    const hubIdx = Math.floor(i / 2) % coreHubs.length;
    dailyHubs.push(coreHubs[hubIdx].name);
  }
  return dailyHubs;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateItinerary(trip: Trip, profile: DestinationProfile): Day[] {
  const numDays = parseDays(trip);
  const budgetPerPersonDay = parseBudget(trip, numDays);
  const isFallback = profile.researchQuality === 'fallback';
  const isThin = profile.researchQuality === 'thin';

  // Ensure at least one hub
  const hubs =
    profile.hubs && profile.hubs.length > 0
      ? profile.hubs
      : [{ name: profile.destination, description: '', typicalStayDays: numDays, highlights: [], coordinates: { lat: 0, lon: 0 } }];

  const dailyHubs = buildDailyHubs(hubs, numDays);

  // Budget and generic name filter
  let budgetFiltered = profile.attractions.filter(a => {
    if (budgetPerPersonDay < 2000 && a.entryFeeINR > 500) return false;
    if (budgetPerPersonDay <= 6000 && a.entryFeeINR > 2500) return false;
    if (/tour|walk|experience|shopping|view|sundowner|dining/i.test(a.name)) return false;
    return true;
  });
  if (budgetFiltered.length < 5) {
    // Fallback but still filter worst generic names
    budgetFiltered = profile.attractions.filter(a => !/tour|walk|experience/i.test(a.name));
    if (budgetFiltered.length === 0) budgetFiltered = profile.attractions;
  }

  const usedNames = new Set<string>();

  let startDate: Date | undefined;
  if (trip.dates) {
    const m = trip.dates.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) startDate = new Date(m[1]);
  }

  const days: Day[] = [];

  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    const seedStr = `${trip.id || 'trip'}-${dayIndex}`;
    const seed = cyrb128(seedStr);
    const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

    const isFirst = dayIndex === 0;
    const isLast = dayIndex === numDays - 1;
    const hubName = dailyHubs[dayIndex];

    // Normalise hub name for case-insensitive matching
    const hubNameLower = hubName.toLowerCase().trim();

    let targetCount = Math.floor(rand() * 3) + 3; // 3–5
    if (isFirst || isLast) targetCount = Math.min(2, targetCount);

    let currentTime = isFirst ? 14 * 60 : 8 * 60 + Math.floor(rand() * 60);

    const dayActivities: Activity[] = [];

    for (let i = 0; i < targetCount; i++) {
      if (isLast && currentTime > 12 * 60) break;

      let unused = budgetFiltered.filter((a: DestinationAttraction) => !usedNames.has(a.name));

      let lat1 = 0;
      let lon1 = 0;
      if (dayActivities.length > 0) {
        const lastAct = dayActivities[dayActivities.length - 1];
        lat1 = lastAct.lat ?? 0;
        lon1 = lastAct.lon ?? 0;
      } else {
        const currentHubObj = hubs.find(h => h.name.toLowerCase().trim() === hubNameLower);
        lat1 = currentHubObj?.coordinates?.lat ?? 0;
        lon1 = currentHubObj?.coordinates?.lon ?? 0;
      }

      let candidates = unused.sort((a, b) => {
        const isHubA = a.hub.toLowerCase().trim() === hubNameLower ? 1 : 0;
        const isHubB = b.hub.toLowerCase().trim() === hubNameLower ? 1 : 0;
        if (isHubA !== isHubB) return isHubB - isHubA;
        
        const popA = a.popularityScore ?? 5;
        const popB = b.popularityScore ?? 5;
        if (popA !== popB) return popB - popA;
        
        const dA = haversineKm(lat1, lon1, a.coordinates?.lat ?? 0, a.coordinates?.lon ?? 0);
        const dB = haversineKm(lat1, lon1, b.coordinates?.lat ?? 0, b.coordinates?.lon ?? 0);
        return dA - dB;
      });

      const allowReuse = profile.attractions.length < numDays * 3;
      if (candidates.length === 0 && allowReuse) {
        const recentNames = new Set<string>();
        dayActivities.forEach(a => recentNames.add(a.name));
        candidates = budgetFiltered.filter((a: DestinationAttraction) => !recentNames.has(a.name));
      }

      if (candidates.length === 0) {
        const genericNames = [`${profile.destination} City Walk`, `Local Cuisine Experience`, `${profile.destination} Central Market`];
        const genericName = genericNames[i % genericNames.length];
        candidates = [{
          name: genericName,
          hub: hubName,
          durationMinutes: 90,
          category: 'culture',
          entryFeeINR: 0,
          description: `Enjoy a classic experience in ${profile.destination}.`,
          coordinates: { lat: 0, lon: 0 },
          popularityScore: 10
        }];
      }

      if (candidates.length === 0) break;

      const poolSize = Math.min(candidates.length, 2);
      const pickIdx = Math.floor(rand() * poolSize);
      const chosen = candidates[pickIdx];

      usedNames.add(chosen.name);

      const hours = Math.floor(currentTime / 60);
      const mins = currentTime % 60;
      const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      let description = chosen.description || '';
      if (isFallback) description = `[Starter suggestion] ${description}`;

      dayActivities.push({
        id: `act_${trip.id || '0'}_${dayIndex}_${i}`,
        name: chosen.name,
        location: chosen.hub,
        startTime,
        durationMinutes: chosen.durationMinutes || 90,
        price: chosen.entryFeeINR || 0,
        category: chosen.category as any,
        description,
        bookingRequired: false,
        lat: chosen.coordinates?.lat,
        lon: chosen.coordinates?.lon,
        imageUrl: getActivityImageUrl(chosen.name, chosen.category as any, profile.destination),
      });

      currentTime += (chosen.durationMinutes || 90) + 30;
    }

    let dateStr: string | undefined;
    if (startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayIndex);
      dateStr = d.toISOString().split('T')[0];
    }

    days.push({ dayIndex, date: dateStr, activities: dayActivities, theme: 'explore' });
  }

  return days;
}
