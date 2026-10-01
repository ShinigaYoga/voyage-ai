import React from "react";
import Link from "next/link";
import { Trip } from "@/lib/types";
import { ChevronRight, Calendar, Users } from "lucide-react";
import { Badge } from "../ui/Badge";

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trip/${trip.id}`} className="block mb-4">
      <div className="bg-white  rounded-card shadow-soft p-4 flex items-center gap-4 hover:shadow-lift transition-shadow">
        <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center shrink-0">
          <span className="text-2xl">🌍</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-ink-900 truncate">{trip.name}</h3>
          <div className="flex items-center gap-3 text-xs text-ink-500 mt-1">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{trip.dates || "TBD"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{trip.travelers}</span>
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="sage">{trip.budget || "Any budget"}</Badge>
          </div>
        </div>
        <div className="text-ink-400">
          <ChevronRight size={20} />
        </div>
      </div>
    </Link>
  );
}
