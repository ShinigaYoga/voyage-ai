import { NextResponse } from "next/server";
import { ServerTripRepository } from "@/lib/repositories/server/MemoryRepositories";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const repo = new ServerTripRepository();
  const trip = await repo.get(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found in memory store" }, { status: 404 });
  }
  return NextResponse.json({ tripId, trip });
}
