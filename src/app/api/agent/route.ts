import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/config";
import { Agent } from "@/lib/ai/Agent";
import { toolRegistry } from "@/lib/ai/tools/registry";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts/systemPrompt";
import { AIMessage } from "@/lib/ai/providers/AIProvider";
import { ServerTripRepository, ServerMessageRepository } from "@/lib/repositories/server/MemoryRepositories";
import { getTransportService, scoreOptions } from "@/lib/services/transport";
import { TransportOption } from "@/lib/services/transport/types";
import { TransportPlan } from "@/lib/services/transport/planningTypes";
import { createItineraryTool } from "@/lib/ai/tools/createItinerary";
import { updateTripTool } from "@/lib/ai/tools/updateTrip";
import { parseItineraryDateRequest } from "@/lib/ai/tools/itineraryDates";
import { detectDayReplanIntent } from "@/lib/ai/tools/dayReplanning";
import { regenerateDayTool } from "@/lib/ai/tools/regenerateDay";
import { getWeatherService } from "@/lib/services/weather";
import type { WeatherForecast } from "@/lib/services/weather/types";
import type { Trip } from "@/lib/types";
import {
  calculateTransportBookingAdvice,
  extractTransportRoute,
  formatTodayInTimeZone,
  isTransportIntent,
  parseTransportDates,
} from "@/lib/services/transport/transportAdvice";

interface AgentApiError {
  code: string;
  message: string;
  retryable: boolean;
}

function classifyAgentError(details: string): { error: AgentApiError; status: number } {
  if (/destination profile not ready/i.test(details)) {
    return {
      error: {
        code: "ITINERARY_NOT_READY",
        message: "The destination details are still loading. Please retry in a moment.",
        retryable: true,
      },
      status: 503,
    };
  }
  if (/all providers failed/i.test(details)) {
    return {
      error: {
        code: "AI_TEMPORARILY_UNAVAILABLE",
        message: "I couldn't reach the AI service. Please retry in a moment.",
        retryable: true,
      },
      status: 503,
    };
  }
  if (/api.?key|unauthori[sz]ed|forbidden|403|401|suspended/i.test(details)) {
    return {
      error: {
        code: "AI_AUTH_FAILED",
        message: "The AI service credentials are unavailable. Please contact support or try again later.",
        retryable: false,
      },
      status: 503,
    };
  }
  if (/429|rate.?limit|quota|resource_exhausted/i.test(details)) {
    return {
      error: {
        code: "AI_RATE_LIMITED",
        message: "The AI service is busy right now. Please retry in a moment.",
        retryable: true,
      },
      status: 429,
    };
  }
  if (/timeout|timed out|network|fetch failed|ECONN|5\d\d|unavailable/i.test(details)) {
    return {
      error: {
        code: "AI_TEMPORARILY_UNAVAILABLE",
        message: "The AI service could not complete this request. Please retry.",
        retryable: true,
      },
      status: 503,
    };
  }
  return {
    error: {
      code: "AGENT_REQUEST_FAILED",
      message: "I couldn't complete that request. Please try again.",
      retryable: false,
    },
    status: 500,
  };
}

function agentFailure(details: string, stack?: string) {
  const classified = classifyAgentError(details);
  const redactCredentials = (value: string) => value
    .replace(/(api[_ -]?key\s*[:=]\s*)[^'"\s,}]+/gi, "$1[REDACTED]")
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,}]+/gi, "$1[REDACTED]")
    .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9_-]{20,})\b/g, "[REDACTED]");
  console.error(
    `[Agent API] Request failed (${classified.error.code}, HTTP ${classified.status}): ${redactCredentials(details)}`,
    stack ? redactCredentials(stack) : ""
  );
  return NextResponse.json({ error: classified.error }, { status: classified.status });
}

function tripDateRange(trip: Trip, today: string) {
  const parsed = parseItineraryDateRequest(trip.dates || "", today);
  return parsed.startDate && parsed.endDate
    ? { startDate: parsed.startDate, endDate: parsed.endDate, days: parsed.days }
    : undefined;
}

function tripCoordinates(trip: Trip): { lat: number; lon: number } | undefined {
  const valid = (coordinates?: { lat: number; lon: number }) =>
    coordinates &&
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lon) &&
    (coordinates.lat !== 0 || coordinates.lon !== 0);
  if (valid(trip.destinationCoords)) return trip.destinationCoords;
  return trip.destinationProfile?.hubs.find(hub => valid(hub.coordinates))?.coordinates;
}

function weatherAffectedDayNumbers(forecasts: WeatherForecast[], trip: Trip, startDate: string): number[] {
  return forecasts
    .filter(forecast =>
      forecast.condition === "storm" ||
      forecast.condition === "snow" ||
      (forecast.condition === "rain" && forecast.precipitationMm >= 2)
    )
    .map(forecast => {
      const itineraryIndex = trip.itinerary?.days.findIndex(day => day.date === forecast.date) ?? -1;
      if (itineraryIndex >= 0) return itineraryIndex + 1;
      const offset = Math.floor(
        (new Date(`${forecast.date}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000
      );
      return offset + 1;
    });
}

function formatDayNumbers(dayNumbers: number[]): string {
  if (dayNumbers.length === 1) return `Day ${dayNumbers[0]}`;
  if (dayNumbers.length === 2) return `Days ${dayNumbers[0]} and ${dayNumbers[1]}`;
  return `Days ${dayNumbers.slice(0, -1).join(", ")}, and ${dayNumbers[dayNumbers.length - 1]}`;
}

function weatherWarning(forecasts: WeatherForecast[], affectedDays: number[]): string {
  if (!affectedDays.length) return "No significant rain or severe weather is forecast during your trip.";
  const affectedDates = forecasts.filter(forecast =>
    forecast.condition === "storm" ||
    forecast.condition === "snow" ||
    (forecast.condition === "rain" && forecast.precipitationMm >= 2)
  );
  const labels = affectedDates.map(forecast => new Date(`${forecast.date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }));
  const formatted = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  const hasSevereWeather = affectedDates.some(forecast =>
    forecast.condition === "storm" || forecast.condition === "snow"
  );
  const weatherLabel = hasSevereWeather ? "Severe weather" : "Rain";
  if (affectedDays.length === 1) {
    return `${weatherLabel} is forecast for ${formatted}. Some outdoor activities may be affected. Would you like me to replan Day ${affectedDays[0]} with indoor or covered alternatives?`;
  }
  return `${weatherLabel} is forecast on ${formatted}. Some outdoor activities may be affected. Would you like me to adjust ${formatDayNumbers(affectedDays)}?`;
}

function getWeatherConfirmation(history: unknown, message: string): { response: "yes" | "no"; dayNumbers: number[] } | undefined {
  const affirmative = /^(?:yes|yeah|yep|sure|okay|ok|please do|go ahead|do it)(?:[\s,.!]|$)|\b(?:yes|go ahead|replan it|adjust those days)\b/i.test(message.trim());
  const negative = /^(?:no|nope|nah|don't|do not|keep it)(?:[\s,.!]|$)|\bno,?\s*(?:thanks|thank you|keep)\b/i.test(message.trim());
  if (!affirmative && !negative) return undefined;
  const entries = Array.isArray(history) ? history : [];
  const hasPendingPrompt = entries.slice(-8).some(entry =>
    entry && typeof entry === "object" &&
    (entry as { role?: unknown }).role === "assistant" &&
    typeof (entry as { content?: unknown }).content === "string" &&
    /would you like me to (?:replan|adjust)|would you like to replan/i.test((entry as { content: string }).content)
  );
  if (!hasPendingPrompt) return undefined;
  const weather = [...entries].reverse().find(entry =>
    entry && typeof entry === "object" &&
    (entry as { type?: unknown }).type === "weather" &&
    Array.isArray((entry as { affectedDayNumbers?: unknown }).affectedDayNumbers)
  ) as { affectedDayNumbers: number[] } | undefined;
  const dayNumbers = weather?.affectedDayNumbers.filter(day => Number.isInteger(day) && day > 0) || [];
  return { response: affirmative ? "yes" : "no", dayNumbers };
}

async function tripWeatherForecast(trip: Trip, startDate: string, endDate: string) {
  try {
    return await getWeatherService().getWeatherRange({
      destination: trip.destination,
      startDate,
      endDate,
      coordinates: tripCoordinates(trip),
    });
  } catch (error: unknown) {
    console.warn(`[Agent API] Trip-date weather unavailable for ${trip.destination} (${startDate} to ${endDate}).`, error);
    return [];
  }
}

async function runAgentWithRetry(
  agent: Agent,
  messages: AIMessage[],
  onProgress: (status: string) => void
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        agent.run(messages, onProgress),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Agent request timed out after 60 seconds")), 60_000);
        }),
      ]);
      if (!result.errors.length || result.artifacts.length > 0 || attempt === 1 ||
        !/429|5\d\d|timeout|network|fetch failed|ECONN|unavailable/i.test(result.errors.join(" "))) {
        return result;
      }
      console.warn("[Agent API] Retrying transient model failure", { attempt: attempt + 1 });
    } catch (error: unknown) {
      const details = error instanceof Error ? error.message : String(error);
      if (attempt === 1 || !/429|5\d\d|timeout|network|fetch failed|ECONN|unavailable/i.test(details)) {
        throw error;
      }
      console.warn("[Agent API] Retrying transient model failure", { attempt: attempt + 1 });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw new Error("Agent request failed after retry");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // tripData is the full Trip object sent by the client (from IndexedDB — source of truth)
    const { tripId, message, history = [], tripData, timeZone: clientTimeZone } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({
        error: {
          code: "INVALID_REQUEST",
          message: "Please enter a message and try again.",
          retryable: false,
        },
      }, { status: 400 });
    }

    const tripRepo = new ServerTripRepository();
    const msgRepo = new ServerMessageRepository();

    // Seed server memory from client-sent trip data (IndexedDB is authoritative).
    // This ensures cold starts / serverless instances always have the trip available.
    if (tripData && tripData.id) {
      await tripRepo.upsert(tripData);
    }

    // Now load trip from server memory (will exist if client sent it above)
    const currentTrip = tripId ? await tripRepo.get(tripId) : null;

    const aiProvider = getAIProvider();

    const toolContext = {
      tripId,
      tripRepository: tripRepo,
      messageRepository: msgRepo,
      currentTrip,
      aiProvider,
    };

    const agent = new Agent(aiProvider, toolRegistry, toolContext);

    // Build AIMessage array
    let systemContent = SYSTEM_PROMPT;
    const timeZone = typeof clientTimeZone === "string" && clientTimeZone
      ? clientTimeZone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentTime = new Date();
    const today = formatTodayInTimeZone(currentTime, timeZone);
    systemContent += `\n\nCURRENT DATE AND TIME:\nToday is ${today}. Current time is ${currentTime.toLocaleString("en-US", { timeZone })} (${timeZone}). Use this date and timezone for all relative travel dates.`;
    if (currentTrip) {
      systemContent += `\n\nCURRENT TRIP CONTEXT:\nYou are currently discussing an existing trip (ID: ${currentTrip.id}). 
Destination: ${currentTrip.destination}
Dates: ${currentTrip.dates || "TBD"}
Travelers: ${currentTrip.travelers}
Budget: ${currentTrip.budget || "Not set"}

DO NOT call createTrip unless the user explicitly wants to start a completely new trip. If the user is adding or changing details (e.g. adding dates, changing destination), use updateTrip.`;
    }

    const aiMessages: AIMessage[] = [
      { role: "system", content: systemContent },
    ];

    // Add prior history if present (cap at last 20 messages to reduce token count/latency)
    if (Array.isArray(history)) {
      const trimmed = history.slice(-20);
      for (const h of trimmed) {
        if (h.role === "user" || h.role === "assistant") {
          aiMessages.push({
            role: h.role,
            content: typeof h.content === "string" ? h.content : JSON.stringify(h.content),
          });
        }
      }
    }

    // Add new user message
    aiMessages.push({ role: "user", content: message });

    let currentStatus = "Understanding your trip...";
    let agentResult: Awaited<ReturnType<Agent["run"]>>;
    const itineraryRequest = /\bitin(?:erary|iary)\b/i.test(message);
    const itineraryDates = itineraryRequest ? parseItineraryDateRequest(message, today) : {};
    const tripDates = itineraryRequest && currentTrip?.dates
      ? parseItineraryDateRequest(currentTrip.dates, today)
      : {};
    const requestedDates = parseItineraryDateRequest(message, today);
    const confirmedTripDates = currentTrip ? tripDateRange(currentTrip, today) : undefined;
    const weatherConfirmation = getWeatherConfirmation(history, message);
    const dayReplan = currentTrip
      ? detectDayReplanIntent(message, history, currentTrip, today)
      : { requested: false as const };
    if (weatherConfirmation?.response === "no") {
      agentResult = {
        textContent: "No problem — I've kept your original itinerary.",
        artifacts: [],
        errors: [],
      };
    } else if (weatherConfirmation?.response === "yes" && currentTrip && weatherConfirmation.dayNumbers.length) {
      const dayNumbers = [...new Set(weatherConfirmation.dayNumbers)]
        .filter(dayNumber => dayNumber <= (currentTrip.itinerary?.days.length || 0));
      if (!dayNumbers.length) {
        agentResult = {
          textContent: "I couldn't match the affected weather dates to days in this itinerary.",
          artifacts: [],
          errors: [],
        };
      } else {
        currentStatus = `Replanning ${formatDayNumbers(dayNumbers)}...`;
        const changes: string[] = [];
        let updatedTrip = currentTrip;
        for (const dayNumber of dayNumbers) {
          const result = await regenerateDayTool.execute({
            tripId: currentTrip.id,
            dayIndex: dayNumber - 1,
            reason: "weather-rain",
            details: "The user approved re-planning for forecast bad weather. Replace weather-sensitive outdoor activities with researched indoor or covered alternatives.",
            targetDate: currentTrip.itinerary?.days[dayNumber - 1]?.date,
            skipWeatherLookup: true,
            persist: false,
          }, toolContext);
          updatedTrip = result.artifact?.trip || updatedTrip;
          changes.push(`✓ ${result.result.changes[0]}`);
        }
        updatedTrip = await tripRepo.upsert(updatedTrip);
        toolContext.currentTrip = updatedTrip;
        agentResult = {
          textContent: changes.join("\n"),
          artifacts: [{ type: "tripUpdated", changes, trip: updatedTrip }],
          errors: [],
        };
      }
    } else if (
      currentTrip &&
      !confirmedTripDates &&
      requestedDates.startDate &&
      requestedDates.endDate
    ) {
      currentStatus = "Saving your travel dates and checking the forecast...";
      const dateUpdate = await updateTripTool.execute({
        tripId: currentTrip.id,
        dates: `${requestedDates.days || 1} days ${requestedDates.startDate} - ${requestedDates.endDate}`,
      }, toolContext);
      const updatedTrip = dateUpdate.result.trip as Trip;
      const forecasts = await tripWeatherForecast(updatedTrip, requestedDates.startDate, requestedDates.endDate);
      const affectedDayNumbers = weatherAffectedDayNumbers(forecasts, updatedTrip, requestedDates.startDate);
      const weatherArtifact = {
        type: "weather" as const,
        destination: updatedTrip.destination,
        forecasts,
        summary: forecasts.length
          ? forecasts.map(forecast => `${forecast.date}: ${forecast.condition}, ${forecast.tempMin}–${forecast.tempMax}°C, ${forecast.precipitationMm} mm precipitation`).join("; ")
          : "Weather unavailable for the selected travel dates.",
        affectedDayNumbers,
      };
      agentResult = {
        textContent: forecasts.length
          ? weatherWarning(forecasts, affectedDayNumbers)
          : "Weather is unavailable for the selected travel dates, but I've saved your dates and updated the itinerary.",
        artifacts: [
          ...(dateUpdate.artifact?.type === "itinerary"
            ? [dateUpdate.artifact as Awaited<ReturnType<Agent["run"]>>["artifacts"][number]]
            : []),
          weatherArtifact,
        ],
        errors: [],
      };
    } else if (currentTrip && /\b(weather|forecast|rain|rainy|storm|snow|temperature|hot|cold)\b/i.test(message) && !/\b(replan|regenerate|change|adjust|replace|modify)\b/i.test(message)) {
      if (!confirmedTripDates) {
        agentResult = {
          textContent: "What dates will you be travelling? Please enter your start and end dates.",
          artifacts: [],
          errors: [],
        };
      } else {
        currentStatus = "Checking weather for your travel dates...";
        const forecasts = await tripWeatherForecast(
          currentTrip,
          confirmedTripDates.startDate,
          confirmedTripDates.endDate,
        );
        const affectedDayNumbers = weatherAffectedDayNumbers(forecasts, currentTrip, confirmedTripDates.startDate);
        agentResult = {
          textContent: forecasts.length
            ? weatherWarning(forecasts, affectedDayNumbers)
            : "Weather is unavailable for the selected travel dates.",
          artifacts: [{
            type: "weather",
            destination: currentTrip.destination,
            forecasts,
            summary: forecasts.length
              ? forecasts.map(forecast => `${forecast.date}: ${forecast.condition}, ${forecast.tempMin}–${forecast.tempMax}°C, ${forecast.precipitationMm} mm precipitation`).join("; ")
              : "Weather unavailable for the selected travel dates.",
            affectedDayNumbers,
          }],
          errors: [],
        };
      }
    } else if (
      dayReplan.intent?.focus.startsWith("weather-") &&
      currentTrip &&
      confirmedTripDates
    ) {
      const forecasts = await tripWeatherForecast(
        currentTrip,
        confirmedTripDates.startDate,
        confirmedTripDates.endDate,
      );
      const affectedDayNumbers = weatherAffectedDayNumbers(forecasts, currentTrip, confirmedTripDates.startDate);
      agentResult = {
        textContent: forecasts.length
          ? weatherWarning(forecasts, affectedDayNumbers)
          : "Weather is unavailable for the selected travel dates. I haven't changed your itinerary.",
        artifacts: [{
          type: "weather",
          destination: currentTrip.destination,
          forecasts,
          summary: forecasts.length
            ? forecasts.map(forecast => `${forecast.date}: ${forecast.condition}, ${forecast.tempMin}–${forecast.tempMax}°C, ${forecast.precipitationMm} mm precipitation`).join("; ")
            : "Weather unavailable for the selected travel dates.",
          affectedDayNumbers,
        }],
        errors: [],
      };
    } else if (dayReplan.requested && dayReplan.clarification) {
      agentResult = {
        textContent: dayReplan.clarification,
        artifacts: [],
        errors: [],
      };
    } else if (dayReplan.requested && dayReplan.intent && currentTrip) {
      if (!currentTrip.itinerary?.days.length) {
        agentResult = {
          textContent: "This trip doesn't have a saved itinerary yet. Create an itinerary first, then I can replan a specific day.",
          artifacts: [],
          errors: [],
        };
      } else {
        const { intent } = dayReplan;
        currentStatus = `Replanning Day ${intent.dayNumber}...`;
        const replanResult = await regenerateDayTool.execute({
          tripId: currentTrip.id,
          dayIndex: intent.dayIndex,
          reason: intent.focus,
          details: intent.details,
          targetDate: intent.targetDate,
        }, toolContext);
        const replannedDay = replanResult.result.day;
        const focusLabel = intent.focus.replace("weather-", "");
        const activityLines = replannedDay.activities.map((activity: { startTime: string; name: string }) =>
          `- ${activity.startTime} — ${activity.name}`
        );
        const unchangedDays = currentTrip.itinerary.days
          .filter((_, index) => index !== intent.dayIndex)
          .map(day => `Day ${day.dayIndex + 1}`);
        const unchangedSummary = unchangedDays.length
          ? `${unchangedDays.join(" and ")} remain unchanged.`
          : "No other itinerary days were changed.";
        agentResult = {
          textContent: [
            `**Day ${intent.dayNumber} replanned for ${focusLabel}**`,
            "",
            ...activityLines,
            "",
            unchangedSummary,
          ].join("\n"),
          artifacts: [
            ...(replanResult.artifact
              ? [replanResult.artifact as Awaited<ReturnType<Agent["run"]>>["artifacts"][number]]
              : []),
            ...(replanResult.result.weather
              ? [{
                  type: "weather" as const,
                  ...replanResult.result.weather,
                  summary: replanResult.result.weather.forecasts
                    .map((forecast: { date: string; condition: string; tempMin: number; tempMax: number }) =>
                      `${forecast.date}: ${forecast.condition}, ${forecast.tempMin}–${forecast.tempMax}°C`
                    )
                    .join("; "),
                }]
              : []),
          ],
          errors: [],
        };
      }
    } else if (itineraryDates.clarification) {
      agentResult = {
        textContent: itineraryDates.clarification,
        artifacts: [],
        errors: [],
      };
    } else if (itineraryRequest && currentTrip && !currentTrip.dates?.trim()) {
      agentResult = {
        textContent: "What dates would you like to travel?",
        artifacts: [],
        errors: [],
      };
    } else if (itineraryRequest && currentTrip) {
      currentStatus = "Building itinerary...";
      const itineraryResult = await createItineraryTool.execute({
        tripId: currentTrip.id,
        days: itineraryDates.days ?? tripDates.days,
        startDate: itineraryDates.startDate ?? tripDates.startDate,
        endDate: itineraryDates.endDate ?? tripDates.endDate,
      }, toolContext);
      if (!itineraryResult.artifact) {
        throw new Error("Itinerary generation completed without a saved itinerary");
      }
      agentResult = {
        textContent: `Here is your ${itineraryResult.result.totalDays}-day itinerary for ${currentTrip.destination}.`,
        artifacts: [itineraryResult.artifact as Awaited<ReturnType<Agent["run"]>>["artifacts"][number]],
        errors: [],
      };
    } else if (isTransportIntent(message, history)) {
      const priorUserContext = Array.isArray(history)
        ? [...history].reverse().find((entry: any) =>
            entry?.role === "user" &&
            typeof entry.content === "string" &&
            /\bfrom\b.+\bto\b/i.test(entry.content)
          )?.content || ""
        : "";
      const transportInput = `${priorUserContext} ${message}`;
      const parsedRoute = extractTransportRoute(transportInput, currentTrip || undefined);
      const dates = parseTransportDates(transportInput, today);

      if (!parsedRoute?.origin || !parsedRoute.destination) {
        agentResult = {
          textContent: "I can check transport options and booking timing. Which cities are you travelling between, and when do you depart?",
          artifacts: [],
          errors: [],
        };
      } else {
        const tripDates = parseTransportDates(currentTrip?.dates || "", today);
        const departureDate = dates.departureDate || tripDates.departureDate;
        const returnDate = dates.returnDate || tripDates.returnDate;
        const bookingQuestion = /\b(when|how early|how far in advance|best time)\b.{0,80}\b(book|booking|reserve|transport(?:ation)?|flight|train|bus)\b|\b(book|booking|reserve)\b.{0,80}\b(when|how early|how far in advance|best time)\b/i.test(message);
        if (bookingQuestion && !departureDate) {
          agentResult = {
            textContent: "I can calculate the booking window once I know your departure date. When do you leave?",
            artifacts: [],
            errors: [],
          };
        } else {
          const service = getTransportService();
          const options = scoreOptions(await service.search({
            origin: parsedRoute.origin,
            destination: parsedRoute.destination,
            date: departureDate,
            passengers: currentTrip?.travelers || 1,
          }));
          const bookingAdvice = departureDate
            ? calculateTransportBookingAdvice(departureDate, today)
            : undefined;
          const trendDates = departureDate && bookingAdvice
            ? [...new Set([...bookingAdvice.milestones, departureDate])].filter(date => date >= today)
            : [];
          const trendOptions = await Promise.all(trendDates.map(date => service.search({
            origin: parsedRoute.origin,
            destination: parsedRoute.destination,
            date,
            passengers: currentTrip?.travelers || 1,
          })));
          const plans: TransportPlan[] = (["flight", "train", "bus"] as const).flatMap(mode => {
            const modeOptions = options.filter(option => option.mode === mode);
            if (!modeOptions.length) return [];
            const trend = trendDates.flatMap((date, index) => {
              const estimates = trendOptions[index].filter(option => option.mode === mode);
              return estimates.length
                ? [{ milestone: date === departureDate ? "Departure" : date === today ? "Today" : "Estimate", date, estimate: Math.min(...estimates.map(option => option.price)) }]
                : [];
            });
            const rangeMin = Math.min(...modeOptions.map(option => option.priceRange?.min ?? option.price));
            const rangeMax = Math.max(...modeOptions.map(option => option.priceRange?.max ?? option.price));
            return [{
              mode,
              duration: `${Math.floor(modeOptions[0].durationMinutes / 60)}h ${modeOptions[0].durationMinutes % 60}m`,
              priceRange: { min: rangeMin, max: rangeMax, currency: "INR", isEstimate: true },
              bookingWindow: { start: bookingAdvice?.windowStart || today, end: bookingAdvice?.windowEnd || departureDate || today },
              trend,
              trendDirection: "flat" as const,
              availability: "unknown" as const,
              lowerPriceWindow: { start: bookingAdvice?.windowStart || today, end: bookingAdvice?.windowEnd || departureDate || today, confidence: "low" as const },
              source: "estimate" as const,
            }];
          });
          agentResult = {
            textContent: "Here are estimated transport options and booking guidance for your route. Would you like to compare a specific mode?",
            artifacts: [{
              type: "unified_transport",
              tripId: tripId || "",
              origin: parsedRoute.origin,
              destination: parsedRoute.destination,
              departureDate,
              returnDate,
              today,
              daysToGo: bookingAdvice?.daysToGo,
              bookingAdvice,
              plans,
              options,
              source: "estimate",
            }],
            errors: [],
          };
        }
      }
    } else {
      agentResult = await runAgentWithRetry(agent, aiMessages, (status) => {
        currentStatus = status;
      });
    }

    if (agentResult.errors.length) {
      const details = agentResult.errors.join("\n");
      return agentFailure(details);
    }
    if (agentResult.textContent?.includes("running in offline mode without an AI provider configured")) {
      return agentFailure("AI provider is not configured: GEMINI_API_KEY is missing or invalid");
    }

    const createdTrip = agentResult.artifacts.find(artifact => artifact.type === "trip");
    if (
      !currentTrip &&
      createdTrip?.type === "trip" &&
      requestedDates.days &&
      !requestedDates.startDate &&
      !requestedDates.endDate
    ) {
      const tripWithoutItinerary = await tripRepo.upsert({
        ...createdTrip.trip,
        itinerary: undefined,
      });
      agentResult.artifacts = agentResult.artifacts
        .filter(artifact => artifact.type !== "itinerary")
        .map(artifact => artifact.type === "trip"
          ? { ...artifact, trip: tripWithoutItinerary }
          : artifact);
      agentResult.textContent = "What dates will you be travelling? Please enter your start and end dates.";
    }

    // Re-read the final trip state after all tools have run
    const resolvedTripId = toolContext.tripId || tripId;
    const finalTrip = resolvedTripId ? await tripRepo.get(resolvedTripId) : currentTrip;

    // Build response text
    let responseText = agentResult.textContent || (agentResult.artifacts.some(artifact => artifact.type === "itinerary")
      ? "Your itinerary is ready."
      : null);
    if (!responseText) {
      if (agentResult.artifacts.length > 0) {
        const lastArt = agentResult.artifacts[agentResult.artifacts.length - 1];
        if (lastArt.type === "trip") {
          responseText = `I've created your ${lastArt.trip.name}. ${lastArt.trip.dates || ''} for ${lastArt.trip.travelers} traveler${lastArt.trip.travelers !== 1 ? 's' : ''}.${lastArt.trip.budget ? ` Budget: ${lastArt.trip.budget}.` : ''}`;
        } else if (lastArt.type === "tripUpdated") {
          responseText = `✓ Trip Updated:\n` + lastArt.changes.map((c) => `• ${c}`).join("\n");
        } else if (lastArt.type === "itinerary") {
          responseText = `Here is your customized itinerary for ${lastArt.itinerary.destination} (${lastArt.itinerary.totalDays} days).`;
        } else if (lastArt.type === "transport") {
          responseText = `Here are the available transport options. Compare and select to update your trip.`;
        }
      } else {
        responseText = "I've processed your trip request.";
      }
    }

    return NextResponse.json({
      assistantMessage: responseText,
      artifacts: agentResult.artifacts,
      trip: finalTrip,
      tripId: resolvedTripId,
      status: currentStatus,
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return agentFailure(details, stack);
  }
}
