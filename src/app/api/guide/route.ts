import { NextResponse } from "next/server";
import { runGuideQuery, GuideContext } from "@/lib/services/guide/GuideService";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, destination, attraction, tripId, day, history = [], trip } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (!destination || typeof destination !== "string") {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    // Load trip from payload or fallback to server memory
    let currentTrip = trip || null;
    if (!currentTrip && tripId) {
      const repo = new ServerTripRepository();
      currentTrip = await repo.get(tripId);
    }

    const ctx: GuideContext = {
      destination,
      attraction: attraction || undefined,
      tripId: tripId || undefined,
      day: day !== undefined ? Number(day) : undefined,
      trip: currentTrip,
    };

    console.log("[Guide API] Received context:", { 
      destination: ctx.destination, 
      day: ctx.day, 
      hasTrip: !!ctx.trip, 
      hasItinerary: !!ctx.trip?.itinerary,
      itineraryDays: ctx.trip?.itinerary?.days?.length 
    });

    const result = await runGuideQuery(message, ctx, history);

    let responseText = result.textContent;
    if (!responseText) {
      if (result.artifacts.length > 0) {
        const last = result.artifacts[result.artifacts.length - 1];
        if (last.type === "attraction") responseText = "Here are some attractions nearby.";
        else if (last.type === "restaurant") responseText = "Here are some dining options.";
        else responseText = "Here is what I found.";
      } else {
        responseText = "I couldn't find specific information about that right now.";
      }
    }

    return NextResponse.json({
      assistantMessage: responseText,
      artifacts: result.artifacts,
    });
  } catch (error: any) {
    console.error("[Guide API Error]", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
