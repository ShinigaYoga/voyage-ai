import { NextResponse } from "next/server";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trip } = body;

    if (!trip || !trip.id) {
      return NextResponse.json({ error: "Trip object with ID is required" }, { status: 400 });
    }

    const tripRepo = new ServerTripRepository();
    // Use upsert to fully replace the trip (preserves itinerary, budget, transport, bookings)
    const updatedTrip = await tripRepo.upsert(trip);

    return NextResponse.json({ trip: updatedTrip });
  } catch (error: any) {
    console.error("[POST /api/trips/sync] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
