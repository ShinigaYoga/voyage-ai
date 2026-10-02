import type { Trip } from "@/lib/types";

export type DayReplanFocus =
  | "weather-rain"
  | "weather-heat"
  | "weather-cold"
  | "indoor"
  | "outdoor"
  | "relaxed"
  | "sightseeing"
  | "food"
  | "nearby"
  | "refresh";

export interface DayReplanIntent {
  dayIndex: number;
  dayNumber: number;
  targetDate?: string;
  focus: DayReplanFocus;
  details: string;
}

export interface DayReplanDetection {
  requested: boolean;
  intent?: DayReplanIntent;
  clarification?: string;
}

const explicitDayReference = /\bday\s*\d{1,2}\b|\btomorrow\b|\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/i;

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function startDateForTrip(trip: Trip): string | undefined {
  const fromDays = trip.itinerary?.days.find(day => day.date)?.date;
  if (fromDays) return fromDays;
  return trip.dates?.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
}

export function classifyDayReplanFocus(text: string): DayReplanFocus {
  const normalized = text.toLowerCase();
  if (/\b(rain|rainy|raining|storm|weather)\b/.test(normalized)) return "weather-rain";
  if (/\b(hot|heat|heatwave|too warm)\b/.test(normalized)) return "weather-heat";
  if (/\b(cold|freezing|snow|blizzard)\b/.test(normalized)) return "weather-cold";
  if (/\b(?:replace|swap|avoid|remove|don't want|do not want|no)\b.{0,35}\b(outdoor|outside)\b/.test(normalized)) return "indoor";
  if (/\b(indoor|inside|covered)\b/.test(normalized)) return "indoor";
  if (/\b(outdoor|outside|open air)\b/.test(normalized)) return "outdoor";
  if (/\b(packed|too many|fewer|less busy|relaxed|relaxing|slow down)\b/.test(normalized)) return "relaxed";
  if (/\b(food|cuisine|eating|restaurants?)\b/.test(normalized)) return "food";
  if (/\b(sightseeing|sights|landmarks?)\b/.test(normalized)) return "sightseeing";
  if (/\b(nearby|too much travel|too far|long distance)\b/.test(normalized)) return "nearby";
  return "refresh";
}

function dayReferenceText(message: string, history: unknown): string {
  if (
    explicitDayReference.test(message) ||
    !/\b(that day|that day's|the same day|keep the rest|rest of my itinerary unchanged)\b/i.test(message)
  ) {
    return message;
  }

  const entries = Array.isArray(history) ? history : [];
  const priorText = entries
    .slice(-12)
    .reverse()
    .map(entry => {
      if (!entry || typeof entry !== "object") return "";
      const record = entry as { role?: unknown; content?: unknown };
      return record.role === "user" && typeof record.content === "string"
        ? record.content
        : "";
    })
    .find(text => explicitDayReference.test(text));

  return priorText ? `${priorText}\n${message}` : message;
}

function indexForWeekday(
  weekday: number,
  trip: Trip,
  today: string
): { dayIndex: number; date?: string } | undefined {
  const days = trip.itinerary?.days || [];
  const start = startDateForTrip(trip);
  if (start) {
    const startValue = new Date(`${start}T00:00:00Z`);
    const startWeekday = startValue.getUTCDay();
    const offset = (weekday - startWeekday + 7) % 7;
    const date = addDays(start, offset);
    const dayIndex = days.findIndex(day => day.date === date);
    if (dayIndex >= 0) return { dayIndex, date };
  } else {
    const tomorrow = addDays(today, 1);
    const tomorrowWeekday = new Date(`${tomorrow}T00:00:00Z`).getUTCDay();
    const offset = (weekday - tomorrowWeekday + 7) % 7;
    if (offset < days.length && days.every(day => !day.date)) {
      return { dayIndex: offset, date: addDays(tomorrow, offset) };
    }
  }
  return undefined;
}

function findTargetDay(text: string, trip: Trip, today: string): { dayIndex: number; date?: string } | undefined {
  const days = trip.itinerary?.days || [];
  const explicitDay = text.match(/\bday\s*(\d{1,2})\b/i);
  if (explicitDay) {
    const dayIndex = Number(explicitDay[1]) - 1;
    if (dayIndex >= 0 && dayIndex < days.length) {
      const targetDate = days[dayIndex].date || (startDateForTrip(trip) ? addDays(startDateForTrip(trip)!, dayIndex) : undefined);
      return { dayIndex, date: targetDate };
    }
    return undefined;
  }

  const tomorrowMatch = /\btomorrow\b/i.test(text);
  if (tomorrowMatch) {
    const tomorrow = addDays(today, 1);
    const matched = days.findIndex(day => day.date === tomorrow);
    if (matched >= 0) return { dayIndex: matched, date: tomorrow };
    const start = startDateForTrip(trip);
    if (start) {
      const offset = Math.floor((new Date(`${tomorrow}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000);
      if (offset >= 0 && offset < days.length) return { dayIndex: offset, date: tomorrow };
    } else if (days.every(day => !day.date)) {
      return days.length ? { dayIndex: 0, date: tomorrow } : undefined;
    }
  }

  const weekdays = [
    ["sunday", "sun"], ["monday", "mon"], ["tuesday", "tue"], ["wednesday", "wed"],
    ["thursday", "thu"], ["friday", "fri"], ["saturday", "sat"],
  ];
  for (let weekday = 0; weekday < weekdays.length; weekday += 1) {
    const [longName, shortName] = weekdays[weekday];
    if (new RegExp(`\\b(?:${longName}|${shortName})\\b`, "i").test(text)) {
      return indexForWeekday(weekday, trip, today);
    }
  }
  return undefined;
}

export function detectDayReplanIntent(
  message: string,
  history: unknown,
  trip: Trip,
  today: string
): DayReplanDetection {
  const contextText = dayReferenceText(message, history);
  const hasDayReference = explicitDayReference.test(contextText) || /\bthat day\b/i.test(message);
  const hasReplanAction = /\b(replan|regenerate|change|modify|replace|move|swap|adjust|rearrange|make|plan|suggest|focus|reduce|simplify)\b/i.test(message);
  const hasReplanPreference =
    /\b(?:i\s+(?:don't|do not)\s+want|i\s+prefer|i'd\s+rather|avoid|without|no)\b.{0,60}\b(?:outdoor|outside|indoor|inside|sightseeing|food|activities|travel|walking)\b/i.test(message) ||
    /\b(?:too\s+(?:packed|busy|hot|cold|many activities|much travel)|packed|fewer activities|less busy|less travel|more relaxed|relaxed|relaxing)\b/i.test(message);
  const hasReplanRequest = hasReplanAction || hasReplanPreference;
  if (!hasDayReference || !hasReplanRequest) return { requested: false };

  const target = findTargetDay(contextText, trip, today);
  if (!target) {
    return {
      requested: true,
      clarification: "I couldn't match that day to this itinerary. Please specify a valid itinerary day or date.",
    };
  }

  const messageFocus = classifyDayReplanFocus(message);
  const focus = messageFocus === "refresh" ? classifyDayReplanFocus(contextText) : messageFocus;
  return {
    requested: true,
    intent: {
      dayIndex: target.dayIndex,
      dayNumber: target.dayIndex + 1,
      targetDate: target.date,
      focus,
      details: contextText,
    },
  };
}
