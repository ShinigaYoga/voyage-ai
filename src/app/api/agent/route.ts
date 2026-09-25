import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/config";
import { Agent } from "@/lib/ai/Agent";
import { toolRegistry } from "@/lib/ai/tools/registry";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts/systemPrompt";
import { AIMessage } from "@/lib/ai/providers/AIProvider";
import { ServerTripRepository, ServerMessageRepository } from "@/lib/repositories/server/MemoryRepositories";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tripId, message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const tripRepo = new ServerTripRepository();
    const msgRepo = new ServerMessageRepository();

    // Ensure the trip is loaded from server memory before running
    const currentTrip = tripId ? await tripRepo.get(tripId) : null;

    const toolContext = {
      tripId,
      tripRepository: tripRepo,
      messageRepository: msgRepo,
      currentTrip,
    };

    const aiProvider = getAIProvider();
    const agent = new Agent(aiProvider, toolRegistry, toolContext);

    // Build AIMessage array
    let systemContent = SYSTEM_PROMPT;
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
    const agentResult = await agent.run(aiMessages, (status) => {
      currentStatus = status;
    });

    // Re-read the final trip state after all tools have run
    const resolvedTripId = toolContext.tripId || tripId;
    const finalTrip = resolvedTripId ? await tripRepo.get(resolvedTripId) : currentTrip;

    // Build response text
    let responseText = agentResult.textContent;
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
  } catch (error: any) {
    console.error("[Agent API Route Error]", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during AI processing." },
      { status: 500 }
    );
  }
}
