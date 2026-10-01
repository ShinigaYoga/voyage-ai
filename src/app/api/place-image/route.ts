import { NextRequest, NextResponse } from "next/server";
import { resolvePlaceImage } from "@/lib/images/resolvePlaceImage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "").trim();
  const destination = (searchParams.get("destination") || "").trim();
  const type = (searchParams.get("type") || "attraction") as "hotel" | "attraction";
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  if (!name || !destination) {
    return NextResponse.json({ error: "Missing name or destination" }, { status: 400 });
  }

  const result = await resolvePlaceImage({
    name,
    destination,
    type,
    lat: latParam ? parseFloat(latParam) : null,
    lng: lngParam ? parseFloat(lngParam) : null,
  });

  return NextResponse.json({
    imageUrl: result.imageUrl ?? null,
    imageAlt: result.imageAlt,
    source: result.source,
    attribution: result.attribution,
    confidence: result.score,
    reason: result.reason,
  });
}
