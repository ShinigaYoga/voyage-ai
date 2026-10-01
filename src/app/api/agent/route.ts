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
import { parseItineraryDateRequest } from "@/lib/ai/tools/itineraryDates";
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
    .replace(/(api_key\s*:\s*)[^'"\s,}]+/gi, "$1[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[REDACTED]");
  console.error("[Agent API] Request failed", {
    code: classified.error.code,
    status: classified.status,
    details: redactCredentials(details),
    stack: stack ? redactCredentials(stack) : undefined,
  });
  return NextResponse.json({ error: classified.error }, { status: classified.status });
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
    if (itineraryDates.clarification) {
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

    // Re-read the final trip state after all tools have run
    const resolvedTripId = toolContext.tripId || tripId;
    const finalTrip = resolvedTripId ? await tripRepo.get(resolvedTripId) : currentTrip;

    // Build response text
    let responseText = agentResult.artifacts.some(artifact => artifact.type === "itinerary")
      ? "Your itinerary is ready."
      : agentResult.textContent;
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
