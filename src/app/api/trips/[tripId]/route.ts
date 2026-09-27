import { NextResponse } from "next/server";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params; // Next.js 15+ sometimes requires params to be awaited, but it's safe to use as is in 14. 
    // Wait, the project is Next.js 14 probably, but let's just await it in case.
    
    if (!tripId) {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }

    const tripRepo = new ServerTripRepository();
    const trip = await tripRepo.get(tripId);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ trip });
  } catch (error: any) {
    console.error("[GET /api/trips/[tripId]] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
