import { Activity, Day, Trip } from '../types';
import { getDestinationProfile, hashSeed } from './destinations';
import { ACTIVITY_BANK, ActivityTemplate } from './activityBank';
import { DestinationCategory } from './profiles';

// ─── Day Theme System ────────────────────────────────────────────────────────

type DayTheme =
  | 'arrival'    // Day 1: light settle-in, 2-3 activities, starts afternoon
  | 'explore'    // Full-day immersion in the destination's signature experience
  | 'culture'    // Temples, forts, museums, markets, local history
  | 'nature'     // Beach, trek, backwater, wildlife, viewpoint
  | 'food'       // Food crawl, cooking class, market tour, café hopping
  | 'adventure'  // Water sports, trek, paragliding, rafting
  | 'relax'      // Spa, slow morning, café, sunset
  | 'departure'; // Last day: 1-2 short activities then travel

/** How many slots each theme uses */
const THEME_SLOT_COUNT: Record<DayTheme, number> = {
  arrival: 2,
  explore: 4,
  culture: 4,
  nature: 4,
  food: 3,
  adventure: 4,
  relax: 3,
  departure: 2,
};

/** Which category hints (slot labels) each theme prefers */
const THEME_CATEGORY_HINTS: Record<DayTheme, string[]> = {
  arrival:   ['evening', 'midday'],
  explore:   ['morning', 'midday', 'afternoon', 'evening'],
  culture:   ['morning', 'midday', 'afternoon', 'evening'],
  nature:    ['morning', 'midday', 'afternoon', 'evening'],
  food:      ['morning', 'midday', 'evening'],
  adventure: ['morning', 'midday', 'afternoon', 'evening'],
  relax:     ['morning', 'midday', 'evening'],
  departure: ['morning', 'midday'],
};

/** Themes where we prefer activities tagged with that theme */
const THEME_ACTIVITY_FILTER: Record<DayTheme, string[]> = {
  arrival:   ['arrival'],
  explore:   ['explore'],
  culture:   ['culture'],
  nature:    ['nature'],
  food:      ['food'],
  adventure: ['adventure'],
  relax:     ['relax'],
  departure: ['departure'],
};

/** Build the narrative arc for a given trip length */
function buildThemeArc(numDays: number, category: DestinationCategory): DayTheme[] {
  if (numDays === 1) return ['explore'];
  if (numDays === 2) return ['arrival', 'departure'];

  // Middle themes chosen based on destination
  const middlePool = buildMiddleThemes(category);

  const themes: DayTheme[] = ['arrival'];
  const middleCount = numDays - 2;

  for (let i = 0; i < middleCount; i++) {
    themes.push(middlePool[i % middlePool.length]);
  }
  themes.push('departure');

  return themes;
}

function buildMiddleThemes(category: DestinationCategory): DayTheme[] {
  switch (category) {
    case 'beach':
      return ['explore', 'nature', 'adventure', 'culture', 'food', 'relax'];
    case 'mountain':
      return ['explore', 'adventure', 'nature', 'culture', 'relax', 'food'];
    case 'heritage':
      return ['culture', 'explore', 'nature', 'food', 'relax', 'adventure'];
    case 'backwater':
      return ['explore', 'nature', 'culture', 'food', 'relax', 'adventure'];
    case 'city':
      return ['explore', 'culture', 'food', 'adventure', 'relax', 'nature'];
    default:
      return ['explore', 'culture', 'nature', 'food', 'relax', 'adventure'];
  }
}

/** Start times per theme */
const THEME_START_TIME: Record<DayTheme, string> = {
  arrival:   '14:00',
  explore:   '07:30',
  culture:   '09:00',
  nature:    '07:00',
  food:      '09:30',
  adventure: '06:30',
  relax:     '09:00',
  departure: '10:00',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(seed: number, dayIndex: number, slotIndex: number): string {
  return `act_${(seed ^ (dayIndex * 1000) ^ slotIndex).toString(36)}`;
}

function pickPrice(template: ActivityTemplate, seed: number, offset: number): number {
  if (template.priceMin === template.priceMax) return template.priceMin;
  const range = template.priceMax - template.priceMin;
  const fraction = ((seed + offset * 17) % 100) / 100;
  const clamped = 0.2 + fraction * 0.6;
  return Math.round((template.priceMin + clamped * range) / 50) * 50;
}

function isGroupTrip(travelers: number): boolean {
  return travelers >= 4;
}

function parseBudgetPerPersonPerDay(trip: Trip): number {
  if (!trip.budget) return 1000;
  const raw = parseInt(trip.budget.replace(/[^0-9]/g, '')) || 0;
  if (!raw) return 1000;
  const travelers = trip.travelers || 1;
  const daysCount = (trip.itinerary?.days.length) || 4;
  return raw / travelers / daysCount;
}

function filterCandidates(
  candidates: ActivityTemplate[],
  budgetPerPersonDay: number,
  isGroup: boolean,
  premium: boolean
): ActivityTemplate[] {
  let pool = [...candidates];

  if (budgetPerPersonDay < 800) {
    const budgetPool = pool.filter(t => t.budgetFriendly);
    if (budgetPool.length > 0) pool = budgetPool;
  } else if (premium) {
    const premiumPool = pool.filter(t => t.premium);
    if (premiumPool.length > 0) pool = premiumPool;
  }

  if (isGroup) {
    const groupPool = pool.filter(t => t.groupFriendly !== false);
    if (groupPool.length > 0) pool = groupPool;
  }

  return pool;
}

function parseStartDate(trip: Trip): Date | null {
  if (!trip.dates) return null;
  const match = trip.dates.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return new Date(match[1]);
  return null;
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// ─── Core Generator ──────────────────────────────────────────────────────────

export function generateItinerary(trip: Trip, totalDays?: number): Day[] {
  const profile = getDestinationProfile(trip.destination, trip.preferences);
  const seed = hashSeed(trip.destination, trip.dates);
  const numDays = totalDays ?? inferDays(trip);
  const travelers = trip.travelers || 1;
  const isGroup = isGroupTrip(travelers);
  const budgetPerPersonDay = parseBudgetPerPersonPerDay(trip);
  const bank = ACTIVITY_BANK[profile.category];
  const startDate = parseStartDate(trip);

  const themeArc = buildThemeArc(numDays, profile.category);
  const usedIds = new Set<string>();

  const days: Day[] = [];

  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    const theme = themeArc[dayIndex] || 'explore';
    const slotsToUse = THEME_CATEGORY_HINTS[theme];
    const slotCount = THEME_SLOT_COUNT[theme];
    const activeSlots = slotsToUse.slice(0, slotCount);
    const themeFilters = THEME_ACTIVITY_FILTER[theme];
    const isPremiumDay = (seed + dayIndex) % 3 === 0;

    let currentTime = THEME_START_TIME[theme];
    const activities: Activity[] = [];

    activeSlots.forEach((slotLabel, slotIndex) => {
      const allCandidates: ActivityTemplate[] = bank[slotLabel] || [];
      if (allCandidates.length === 0) return;

      // Prefer activities tagged for this theme; fall back to all if pool too small
      const themeTagged = allCandidates.filter(t =>
        t.themes && t.themes.some(th => themeFilters.includes(th))
      );
      const preferredPool = themeTagged.length >= 2 ? themeTagged : allCandidates;

      // Exclude already-used activities
      const unusedPool = preferredPool.filter(t => !usedIds.has(t.id));
      const candidatePool = unusedPool.length > 0 ? unusedPool : preferredPool; // allow reuse only as last resort

      if (candidatePool.length === 0) return;

      const filtered = filterCandidates(candidatePool, budgetPerPersonDay, isGroup, isPremiumDay);
      const finalPool = filtered.length > 0 ? filtered : candidatePool;

      // Deterministic pick using prime-offset per day+slot to spread selections
      const dayOffset = dayIndex * 97 + slotIndex * 31 + (theme.charCodeAt(0) * 7);
      const template = finalPool[(seed + dayOffset) % finalPool.length];

      usedIds.add(template.id);

      const price = pickPrice(template, seed, dayOffset + 3);
      const duration = theme === 'departure' ? Math.round(template.durationMinutes * 0.7) : template.durationMinutes;

      activities.push({
        id: generateId(seed, dayIndex, slotIndex),
        name: template.name,
        location: template.location,
        startTime: currentTime,
        durationMinutes: duration,
        price,
        category: template.category,
        description: template.description,
        bookingRequired: template.bookingRequired,
        lat: template.lat,
        lon: template.lon,
      });

      // Advance time: activity duration + 30 min travel/buffer
      currentTime = addMinutes(currentTime, duration + 30);
    });

    let dateStr: string | undefined;
    if (startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayIndex);
      dateStr = d.toISOString().split('T')[0];
    }

    days.push({
      dayIndex,
      date: dateStr,
      activities,
      theme,
    });
  }

  // Dev-only duplicate check
  if (process.env.NODE_ENV === 'development') {
    const names = days.flatMap(d => d.activities.map(a => a.name));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      console.warn('[Generator] Duplicate activities across days:', dupes);
    }
  }

  return days;
}

function inferDays(trip: Trip): number {
  if (!trip.dates) return 4;
  const daysMatch = trip.dates.match(/(\d+)\s*day/i);
  if (daysMatch) return Math.max(1, Math.min(14, parseInt(daysMatch[1])));
  const dateRange = trip.dates.match(/(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/);
  if (dateRange) {
    const diff = (new Date(dateRange[2]).getTime() - new Date(dateRange[1]).getTime()) / 86400000;
    return Math.max(1, Math.min(14, Math.round(diff)));
  }
  return 4;
}
