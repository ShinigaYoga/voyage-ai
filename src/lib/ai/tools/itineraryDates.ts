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
  const add = (index: number, year: number, month: number, day: number, explicitYear: boolean) => {
    let value = validIsoDate(year, month, day);
    if (!value) return;
    if (!explicitYear && value < today) {
      value = validIsoDate(year + 1, month, day);
      if (!value) return;
    }
    dates.push({ index, value, explicitYear });
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
  dates.sort((a, b) => a.index - b.index);
  if (dates.length === 2 && dates[1].value < dates[0].value && !dates[1].explicitYear) {
    const [year, month, day] = dates[1].value.split("-").map(Number);
    dates[1].value = validIsoDate(year + 1, month - 1, day) || dates[1].value;
  }

  const duration = input.match(/\b(\d{1,2})\s+days?\b/i);
  const statedDays = duration ? Number(duration[1]) : undefined;
  const startDate = dates[0]?.value;
  const statedEndDate = dates[1]?.value;
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
  if (startDate && statedDays) {
    const end = new Date(`${startDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + statedDays - 1);
    return { startDate, endDate: end.toISOString().slice(0, 10), days: statedDays };
  }
  if (startDate) return { startDate };
  return { days: statedDays };
}
