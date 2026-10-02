export interface ParsedItineraryDates {
  startDate?: string;
  endDate?: string;
  days?: number;
  clarification?: string;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9,
  october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const MONTH_PATTERN = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function validIsoDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : undefined;
}

export function parseItineraryDateRequest(input: string, today: string): ParsedItineraryDates {
  const dates: Array<{ index: number; value: string; explicitYear: boolean }> = [];
  let explicitSingleDayRange = false;
  const add = (index: number, year: number, month: number, day: number, explicitYear: boolean) => {
    let value = validIsoDate(year, month, day);
    if (!value) return;
    if (!explicitYear && value < today) {
      value = validIsoDate(year + 1, month, day);
      if (!value) return;
    }
    dates.push({ index, value, explicitYear });
    return value;
  };

  for (const match of input.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) {
    add(match.index ?? 0, Number(match[1]), Number(match[2]) - 1, Number(match[3]), true);
  }
  for (const match of input.matchAll(new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, "gi"))) {
    const month = MONTH_INDEX[match[1].toLowerCase()];
    const year = match[3] ? Number(match[3]) : Number(today.slice(0, 4));
    add(match.index ?? 0, year, month, Number(match[2]), Boolean(match[3]));
  }
  for (const match of input.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:,?\\s+(20\\d{2}))?\\b`, "gi"))) {
    const month = MONTH_INDEX[match[2].toLowerCase()];
    const year = match[3] ? Number(match[3]) : Number(today.slice(0, 4));
    add(match.index ?? 0, year, month, Number(match[1]), Boolean(match[3]));
  }

  const rangeSeparator = "(?:to|through|until|[-–—])";
  for (const match of input.matchAll(new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*${rangeSeparator}\\s*(?:(${MONTH_PATTERN})\\s*)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, "gi"))) {
    const startIndex = match.index ?? 0;
    const rangeStart = add(startIndex, Number(today.slice(0, 4)), MONTH_INDEX[match[1].toLowerCase()], Number(match[2]), false);
    const endMonth = match[3] ? MONTH_INDEX[match[3].toLowerCase()] : MONTH_INDEX[match[1].toLowerCase()];
    const endYear = match[5] ? Number(match[5]) : Number(today.slice(0, 4));
    const endIndex = (match.index ?? 0) + match[0].lastIndexOf(match[4]);
    const rangeEnd = add(endIndex, endYear, endMonth, Number(match[4]), Boolean(match[5]));
    if (rangeStart && rangeStart === rangeEnd) explicitSingleDayRange = true;
  }
  for (const match of input.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*${rangeSeparator}\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:,?\\s+(20\\d{2}))?\\b`, "gi"))) {
    const year = match[4] ? Number(match[4]) : Number(today.slice(0, 4));
    const startIndex = match.index ?? 0;
    const endIndex = (match.index ?? 0) + match[0].lastIndexOf(match[2]);
    const month = MONTH_INDEX[match[3].toLowerCase()];
    const rangeStart = add(startIndex, year, month, Number(match[1]), Boolean(match[4]));
    const rangeEnd = add(endIndex, year, month, Number(match[2]), Boolean(match[4]));
    if (rangeStart && rangeStart === rangeEnd) explicitSingleDayRange = true;
  }
  for (const match of input.matchAll(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi)) {
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const current = new Date(`${today}T00:00:00Z`);
    let offset = (weekdays.indexOf(match[1].toLowerCase()) - current.getUTCDay() + 7) % 7;
    if (offset === 0) offset = 7;
    current.setUTCDate(current.getUTCDate() + offset);
    dates.push({ index: match.index ?? 0, value: current.toISOString().slice(0, 10), explicitYear: true });
  }
  dates.sort((a, b) => a.index - b.index);
  const uniqueDates = dates.filter((date, index) =>
    index === 0 || date.value !== dates[index - 1].value
  );
  if (uniqueDates.length === 2 && uniqueDates[1].value < uniqueDates[0].value && !uniqueDates[1].explicitYear) {
    const [year, month, day] = uniqueDates[1].value.split("-").map(Number);
    uniqueDates[1].value = validIsoDate(year + 1, month - 1, day) || uniqueDates[1].value;
  }

  const duration = input.match(/\b(\d{1,2})[\s-]+days?\b/i);
  const statedDays = duration ? Number(duration[1]) : undefined;
  const startDate = uniqueDates[0]?.value;
  const statedEndDate = uniqueDates[1]?.value;
  if (startDate && statedEndDate) {
    const rangeDays = Math.floor(
      (new Date(`${statedEndDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86400000
    ) + 1;
    if (statedDays && statedDays !== rangeDays) {
      return {
        startDate,
        endDate: statedEndDate,
        days: statedDays,
        clarification: `You said ${statedDays} days but gave ${startDate} to ${statedEndDate} (${rangeDays} days). Which duration should I use?`,
      };
    }
    return { startDate, endDate: statedEndDate, days: rangeDays };
  }
  if (startDate && explicitSingleDayRange) {
    return { startDate, endDate: startDate, days: 1 };
  }
  if (startDate && statedDays) {
    const end = new Date(`${startDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + statedDays - 1);
    return { startDate, endDate: end.toISOString().slice(0, 10), days: statedDays };
  }
  if (startDate) return { startDate };
  return { days: statedDays };
}
