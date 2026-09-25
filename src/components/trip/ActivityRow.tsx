"use client";

import React, { useState } from "react";
import { Activity } from "@/lib/types";
import { MapPin, Clock, MoreVertical, Trash2, Edit2, Move } from "lucide-react";
import { IconButton } from "../ui/IconButton";

interface ActivityRowProps {
  activity: Activity;
  isLast?: boolean;
  distanceLabel?: string;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function ActivityRow({ activity, isLast = false, distanceLabel, onEdit, onRemove }: ActivityRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-coral-100 text-coral-600';
      case 'nature': return 'bg-sage-100 text-sage-600';
      case 'culture': return 'bg-amber-100 text-amber-600';
      case 'nightlife': return 'bg-indigo-100 text-indigo-600';
      case 'shopping': return 'bg-pink-100 text-pink-600';
      case 'rest': return 'bg-sky-100 text-sky-600';
      default: return 'bg-cream-200 text-ink-500';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'food': return '🍽️';
      case 'nature': return '🌿';
      case 'culture': return '🏛️';
      case 'nightlife': return '🍸';
      case 'shopping': return '🛍️';
      case 'rest': return '🧘';
      default: return '📍';
    }
  };

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline track */}
      {!isLast && (
        <div className="absolute left-6 top-10 bottom-0 w-px bg-cream-200 -z-10 translate-x-[0.5px]" />
      )}

      {/* Time & Icon */}
      <div className="flex flex-col items-center gap-2 w-12 shrink-0 pt-1">
        <span className="text-xs font-bold text-ink-500">{activity.startTime}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getCategoryColor(activity.category)} shadow-sm z-0`}>
          {getCategoryIcon(activity.category)}
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 pb-6">
        <div className="bg-white dark:bg-cream-200 rounded-2xl p-4 shadow-sm border border-cream-100 dark:border-cream-300 group-hover:border-cream-200 group-hover:shadow-soft transition-all">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-bold text-ink-900 leading-tight mb-1">{activity.name}</h4>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 mt-2">
                <span className="flex items-center gap-1"><MapPin size={12} /> {activity.location}</span>
                {distanceLabel && (
                  <span className="inline-flex items-center bg-cream-100 dark:bg-cream-300/60 text-ink-500 border border-cream-200 rounded-full px-2 py-0.5 font-medium leading-none">
                    {distanceLabel}
                  </span>
                )}
                <span className="flex items-center gap-1"><Clock size={12} /> {activity.durationMinutes}m</span>
                <span className="font-medium text-ink-700">₹{activity.price.toLocaleString()}</span>
              </div>
              
              {activity.description && (
                <p className="text-sm text-ink-500 mt-3 leading-relaxed">{activity.description}</p>
              )}
            </div>

            <div className="relative">
              <IconButton 
                icon={<MoreVertical size={16} />} 
                variant="ghost" 
                size="sm"
                onClick={() => setMenuOpen(!menuOpen)}
              />
              
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-cream-200 rounded-xl shadow-float border border-cream-100 dark:border-cream-300 py-1 z-50 overflow-hidden">
                    {onEdit && (
                      <button 
                        onClick={() => { setMenuOpen(false); onEdit(activity.id); }}
                        className="w-full text-left px-3 py-2 text-sm text-ink-700 hover:bg-cream-50 flex items-center gap-2"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    )}
                    {onRemove && (
                      <button 
                        onClick={() => { setMenuOpen(false); onRemove(activity.id); }}
                        className="w-full text-left px-3 py-2 text-sm text-coral-600 hover:bg-coral-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
