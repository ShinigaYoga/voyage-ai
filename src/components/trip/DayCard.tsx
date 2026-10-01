"use client";

import React, { useState } from "react";
import { Day } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActivityRow } from "./ActivityRow";
import { Card } from "../ui/Card";

import { getDistanceService, DistanceResult } from "@/lib/services/distance";
import { resolveActivityCoords } from "@/lib/itinerary/coordinateUtils";
import { usePlaceImages } from "@/lib/hooks/usePlaceImages";

interface DayCardProps {
  day: Day;
  destination?: string;
  destinationCoords?: { lat: number; lon: number } | null;
  originCoords?: { lat: number; lon: number; label?: string } | null;
  activeActivityId?: string | null;
  onActivitySelect?: (id: string) => void;
  onEditActivity?: (id: string) => void;
  onRemoveActivity?: (id: string) => void;
}

export function DayCard({ day, destination, destinationCoords, originCoords, activeActivityId, onActivitySelect, onEditActivity, onRemoveActivity }: DayCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Format date if available, otherwise just "Day X"
  let title = `Day ${day.dayIndex + 1}`;
  let subtitle = "";
  if (day.date) {
    const d = new Date(day.date);
    subtitle = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const ds = getDistanceService();
  let totalKm = 0;
  let totalMin = 0;

  // Enrich activities with images lazily on render
  const enrichedActivities = usePlaceImages(day.activities, "attraction", destination || "");

  // Resolve coords for each activity (uses stored lat/lon or deterministic fallback)
  const resolvedActivities = enrichedActivities.map(act => ({
    act,
    coords: resolveActivityCoords(act.name, act.lat, act.lon, destination || "", destinationCoords),
  }));

  const activitiesWithDistances = resolvedActivities.map(({ act, coords }, idx) => {
    let prevCoords: { lat: number; lon: number } | null | undefined = originCoords;
    if (idx > 0) {
      prevCoords = resolvedActivities[idx - 1].coords;
    }

    let dist: DistanceResult | null = null;
    if (prevCoords && coords) {
      dist = ds.calculateDistance(prevCoords.lat, prevCoords.lon, coords.lat, coords.lon);
      if (dist) {
        totalKm += dist.distanceKm;
        totalMin += dist.travelMinutes;
      }
    }

    // Fallback label if origin is destination center
    let label = dist?.label;
    if (dist && originCoords?.label === "center" && idx === 0) {
      label = `📍 ${dist.distanceKm >= 1 ? dist.distanceKm.toFixed(1) + ' km' : Math.round(dist.distanceKm * 1000) + ' m'} from center`;
    }

    return { act, label };
  });

  // Add return trip to origin
  if (originCoords && resolvedActivities.length > 0) {
    const lastCoords = resolvedActivities[resolvedActivities.length - 1].coords;
    if (lastCoords) {
      const returnDist = ds.calculateDistance(lastCoords.lat, lastCoords.lon, originCoords.lat, originCoords.lon);
      if (returnDist) {
        totalKm += returnDist.distanceKm;
        totalMin += returnDist.travelMinutes;
      }
    }
  }

  const travelSummary = totalKm > 0 ? `${Number(totalKm.toFixed(1))} km total · ${totalMin} min travel` : "";


  return (
    <Card className="overflow-hidden mb-4 border border-cream-200">
      {/* Header */}
      <div 
        className="px-5 py-4 bg-cream-50 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-display font-bold text-ink-900">{title}</h3>
            {subtitle && <span className="text-sm font-medium text-ink-500">{subtitle}</span>}
          </div>
          {travelSummary && (
            <div className="text-xs font-semibold text-ink-500 tracking-wide">
              {travelSummary}
            </div>
          )}
        </div>
        <button className="text-ink-400 hover:text-ink-900 transition-colors p-1">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-5 pt-6 bg-white  border-t border-cream-100 ">
          {day.activities.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">
              No activities planned for this day yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {activitiesWithDistances.map(({ act, label }, idx) => (
                <ActivityRow 
                  key={act.id} 
                  activity={act} 
                  distanceLabel={label}
                  isLast={idx === day.activities.length - 1}
                  isActive={activeActivityId === act.id}
                  onClick={() => onActivitySelect?.(act.id)}
                  onEdit={onEditActivity}
                  onRemove={onRemoveActivity}
                />
              ))}
            </div>
          )}

          {onEditActivity && (
            <div className="mt-4 pt-3 border-t border-cream-100 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditActivity(`new_${day.dayIndex}`);
                }}
                className="text-xs font-semibold text-sage-700 hover:text-sage-900 bg-sage-50 hover:bg-sage-100 border border-sage-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                + Add activity
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
