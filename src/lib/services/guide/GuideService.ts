import { Agent } from "@/lib/ai/Agent";
import { getAIProvider } from "@/lib/ai/config";
import { AIMessage } from "@/lib/ai/providers/AIProvider";
import { ToolDefinition } from "@/lib/ai/tools/types";
import { getWeatherTool } from "@/lib/ai/tools/getWeather";
import { findNearbyPlacesTool } from "@/lib/ai/tools/findNearbyPlaces";
import { searchAttractionsTool } from "@/lib/ai/tools/searchAttractions";
import { searchRestaurantsTool } from "@/lib/ai/tools/searchRestaurants";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";
import { ServerMessageRepository } from "@/lib/repositories/server/MemoryRepositories";
import { Trip } from "@/lib/types";

// Read-only tool registry — NEVER includes createTrip, updateTrip, selectTransport, bookItem, etc.
const GUIDE_TOOLS: Record<string, ToolDefinition> = {
  getWeather: getWeatherTool,
  findNearbyPlaces: findNearbyPlacesTool,
  searchAttractions: searchAttractionsTool,
  searchRestaurants: searchRestaurantsTool,
};

export interface GuideContext {
  destination: string;
  attraction?: string;
  tripId?: string;
  day?: number;
  trip?: Trip | null;
}

function buildGuideSystemPrompt(ctx: GuideContext): string {
  const { destination, attraction, day, trip } = ctx;

  let parsedItinerary = trip?.itinerary;
  if (typeof parsedItinerary === 'string') {
    try {
      parsedItinerary = JSON.parse(parsedItinerary);
    } catch (e) {
      console.warn("Failed to parse itinerary string in GuideService");
    }
  }

  let itineraryContext = "";
  if (parsedItinerary?.days && day !== undefined) {
    const dayData = parsedItinerary.days.find((d: any) => d.dayIndex === day - 1) || parsedItinerary.days[day - 1];
    if (dayData) {
      const activityNames = dayData.activities.map((a: any) => a.name).join(", ");
      itineraryContext = `\nDay ${day} itinerary includes: ${activityNames || "no activities yet"}.`;
    }
  } else if (parsedItinerary?.days) {
    const allActivities = parsedItinerary.days
      .flatMap((d: any) => d.activities.map((a: any) => `Day ${d.dayIndex + 1}: ${a.name}`))
      .join("; ");
    if (allActivities) {
      itineraryContext = `\nCurrent itinerary: ${allActivities}.`;
    }
  }

  return `You are Voyage Ranger, a knowledgeable local tour guide inside VoyageAI.
You are currently guiding the traveler at: ${destination}${attraction ? ` › ${attraction}` : ""}.${itineraryContext}

Your role is STRICTLY READ-ONLY. You:
- Answer contextual questions about places, culture, food, history, best visit times, and nearby spots.
- Use tools to find real attraction, restaurant, and weather data. NEVER invent data.
- When asked "What should I visit next?" — you MUST base your answer on the itinerary context provided above. Read the activities listed for the day and recommend the next logical place FROM THAT ITINERARY. Do not blindly search for generic attractions if the user already has an itinerary.
- DO NOT modify trips, create bookings, update itineraries, or change any trip state.
- DO NOT call createTrip, updateTrip, createItinerary, selectTransport, bookItem, or any write tool.
- If asked to book something or change the trip, politely say: "I'm your guide, not a planner — ask Voyage AI in the chat to do that."

Tools available:
- getWeather: real forecast for any destination
- searchAttractions: find things to see and do
- searchRestaurants: find places to eat
- findNearbyPlaces: find nearby points of interest by type

Always call tools before answering factual questions about places. Never invent names, prices, or data.
Speak warmly, like a knowledgeable local. Be concise but insightful.`;
}

export async function runGuideQuery(
  userMessage: string,
  ctx: GuideContext,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
) {
  const systemPrompt = buildGuideSystemPrompt(ctx);

  const aiMessages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  const provider = getAIProvider();
  const tripRepo = new ServerTripRepository();
  const msgRepo = new ServerMessageRepository();

  const toolContext = {
    tripId: ctx.tripId,
    tripRepository: tripRepo,
    messageRepository: msgRepo,
    currentTrip: ctx.trip || null,
  };

  const agent = new Agent(provider, GUIDE_TOOLS, toolContext);
  const result = await agent.run(aiMessages);

  return result;
}
