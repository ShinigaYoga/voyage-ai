import React, { useState } from "react";
import Link from "next/link";
import { Trip } from "@/lib/types";
import { ChevronRight, Calendar, Users, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";

interface TripCardProps {
  trip: Trip;
  onDelete?: (trip: Trip) => void;
  removing?: boolean;
}

export function TripCard({ trip, onDelete, removing = false }: TripCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const requestDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    onDelete?.(trip);
  };

  return (
    <div className={`relative mb-4 overflow-hidden rounded-card transition-all duration-200 motion-reduce:transition-none ${removing ? "max-h-0 -translate-x-4 opacity-0" : "max-h-40 opacity-100"}`}>
      <div className="bg-white rounded-card shadow-soft flex items-center gap-3 p-4 hover:shadow-lift transition-shadow">
        <Link href={`/trip/${trip.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-600">
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
        </Link>
        {onDelete && (
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={requestDelete}
              aria-label={`Delete ${trip.name}`}
              className="rounded-lg p-2 text-coral-700 hover:bg-coral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral-700"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              aria-label={`More actions for ${trip.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(open => !open);
              }}
              className="rounded-lg p-2 text-ink-500 hover:bg-cream-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-600"
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-10 min-w-36 rounded-xl border border-cream-200 bg-white p-1 shadow-lift">
                <button
                  type="button"
                  role="menuitem"
                  onClick={requestDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-coral-700 hover:bg-coral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral-700"
                >
                  <Trash2 size={16} /> Delete trip
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
