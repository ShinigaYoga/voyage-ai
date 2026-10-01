export interface TransportDates {
  departureDate?: string;
  returnDate?: string;
}

export interface TransportBookingAdvice {
  daysToGo: number;
  bookNow: boolean;
  windowStart: string;
  windowEnd: string;
  milestones: string[];
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9,
  october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function parseDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return;
  return date.toISOString().slice(0, 10);
}

function nextYearIfPast(date: string, today: string): string {
  if (date >= today) return date;
  const [year, month, day] = date.split("-").map(Number);
  return parseDate(year + 1, month - 1, day) || date;
}

export function parseTransportDates(input: string, today: string): TransportDates {
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (date?: string) => {
    if (date && !seen.has(date)) {
      seen.add(date);
      found.push(date);
    }
  };

  for (const match of input.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    add(parseDate(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  for (const match of input.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/gi)) {
    const month = MONTHS[match[1].toLowerCase()];
    const year = match[3] ? Number(match[3]) : Number(today.slice(0, 4));
    let date = parseDate(year, month, Number(match[2]));
    if (date && !match[3]) date = nextYearIfPast(date, today);
    add(date);
  }
  for (const match of input.matchAll(/\bin\s+(\d+)\s+(day|week)s?\b/gi)) {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(match[1]) * (match[2].toLowerCase() === "week" ? 7 : 1));
    add(date.toISOString().slice(0, 10));
  }
  for (const match of input.matchAll(/\b(\d+)\s+(day|week)s?\s+away\b/gi)) {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(match[1]) * (match[2].toLowerCase() === "week" ? 7 : 1));
    add(date.toISOString().slice(0, 10));
  }

  found.sort();
  return { departureDate: found[0], returnDate: found[1] };
}

export function calculateTransportBookingAdvice(
  departureDate: string,
  today: string
): TransportBookingAdvice {
  const todayDate = new Date(`${today}T00:00:00Z`);
  const departure = new Date(`${departureDate}T00:00:00Z`);
  const daysToGo = Math.floor((departure.getTime() - todayDate.getTime()) / 86400000);
  const bookNow = daysToGo < 7;
  const subtractMonths = (date: Date, months: number) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() - months;
    const targetMonth = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    targetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDay));
    return targetMonth;
  };
  const sixMonthsBefore = subtractMonths(departure, 6);
  const twoMonthsBefore = subtractMonths(departure, 2);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const compressedWindow = today >= iso(twoMonthsBefore);
  const windowStart = compressedWindow || iso(sixMonthsBefore) < today ? today : iso(sixMonthsBefore);
  const windowEnd = compressedWindow ? departureDate : iso(twoMonthsBefore);
  const totalWindowDays = Math.max(0, Math.floor(
    (new Date(`${windowEnd}T00:00:00Z`).getTime() - new Date(`${windowStart}T00:00:00Z`).getTime()) / 86400000
  ));
  const milestones = Array.from(new Set([
    windowStart,
    iso(new Date(new Date(`${windowStart}T00:00:00Z`).getTime() + Math.floor(totalWindowDays / 2) * 86400000)),
    windowEnd,
  ])).filter(date => date >= today && date <= departureDate);
  if (bookNow) return { daysToGo, bookNow: true, windowStart: today, windowEnd: departureDate < today ? today : departureDate, milestones: [today] };
  return { daysToGo, bookNow: false, windowStart, windowEnd, milestones };
}

export function formatTodayInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isTransportIntent(
  message: string,
  history: Array<{ role?: string; content?: unknown }> = []
): boolean {
  const transportTerms = /\b(transport(?:ation)?|travel(?:ling|ing)?|flight|train|bus|fare|ticket|journey)\b/i;
  const timing = /\b(when|how early|how far in advance|best time)\b.{0,80}\b(book|booking|reserve|transport(?:ation)?|flight|train|bus)\b|\b(book|booking|reserve)\b.{0,80}\b(when|how early|how far in advance|best time)\b/i;
  const options = /\b(show|find|search|list|compare|options?|tickets?|fares?)\b/i;
  const routeAndDate = /\bfrom\b.+\bto\b.+(?:\b20\d{2}-\d{2}-\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\bin\s+\d+\s+(?:days?|weeks?)\b|\b\d+\s+days?\s+away\b)/i;
  const affirmative = /^\s*(yes|yeah|yep|sure|ok(?:ay)?|please|go ahead|show me)\b/i.test(message);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const previousText = recentHistory.map(item =>
    typeof item.content === "string" ? item.content : JSON.stringify(item.content ?? "")
  ).join(" ");
  const priorRoute = /\bfrom\b.+\bto\b/i.test(previousText);
  const priorTransportQuestion = transportTerms.test(previousText) ||
    (priorRoute && /\b(book|booking|reserve|options?|compare|show|find)\b/i.test(previousText));

  return timing.test(message) ||
    (transportTerms.test(message) && (options.test(message) || routeAndDate.test(message) || /\b(book|booking|reserve)\b/i.test(message))) ||
    (affirmative && priorTransportQuestion);
}

export function extractTransportRoute(
  input: string,
  trip?: { name?: string; destination?: string }
): { origin: string; destination: string } | null {
  const withoutDates = input
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+20\d{2})?\b/gi, " ")
    .replace(/\bin\s+\d+\s+(?:day|week)s?\b/gi, " ")
    .replace(/\b(on|departing|returning|round trip|for)\b.*$/i, " ")
    .replace(/[.!?,]/g, " ")
    .trim();
  const route = withoutDates.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+(?:i'm|im|we|and|round)\b|$)/i);
  if (route?.[1]?.trim() && route[2]?.trim()) {
    return { origin: route[1].trim(), destination: route[2].trim() };
  }
  const tripRoute = trip?.name?.match(/^(.+?)\s+to\s+(.+?)$/i);
  if (tripRoute) return { origin: tripRoute[1].trim(), destination: tripRoute[2].trim() };
  if (trip?.destination) return { origin: "", destination: trip.destination };
  return null;
}
