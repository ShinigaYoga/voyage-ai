import React, { useState, useEffect, useRef } from "react";
import { MessageType } from "@/lib/types";

export const ALL_FILTER_TYPES: MessageType[] = [
  "text", "trip", "tripUpdated", "transport", "hotel", "restaurant", "attraction", "itinerary", "activity", "booking", "food", "weather"
];

const FILTER_LABELS: Record<MessageType, string> = {
  text: "Text messages",
  trip: "Trip cards",
  tripUpdated: "Trip updates",
  transport: "Transport",
  hotel: "Hotels",
  restaurant: "Restaurants",
  attraction: "Attractions",
  itinerary: "Itineraries",
  activity: "Activities",
  booking: "Bookings",
  food: "Food & Dining",
  weather: "Weather",
};

interface MessageFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: MessageType[];
  onChange: (filters: MessageType[]) => void;
}

export function MessageFilterPopover({ isOpen, onClose, activeFilters, onChange }: MessageFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (type: MessageType) => {
    if (activeFilters.includes(type)) {
      onChange(activeFilters.filter((t) => t !== type));
    } else {
      onChange([...activeFilters, type]);
    }
  };

  const handleReset = () => {
    onChange([...ALL_FILTER_TYPES]);
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute top-14 right-4 w-64 bg-white dark:bg-cream-200 rounded-card shadow-float border border-cream-200 z-50 overflow-hidden"
    >
      <div className="p-3 border-b border-cream-100 bg-cream-50 font-semibold text-ink-900 text-sm">
        Filter Messages
      </div>
      <div className="max-h-[300px] overflow-y-auto p-2">
        {ALL_FILTER_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-3 p-2 hover:bg-cream-50 rounded cursor-pointer transition-colors">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="peer appearance-none w-4 h-4 border-2 border-cream-200 rounded-sm checked:bg-sage-600 checked:border-sage-600 transition-colors cursor-pointer"
                checked={activeFilters.includes(type)}
                onChange={() => handleToggle(type)}
              />
              <svg className="absolute w-3 h-3 text-white left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 14 10" fill="none">
                <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm text-ink-700">{FILTER_LABELS[type]}</span>
          </label>
        ))}
      </div>
      <div className="p-3 border-t border-cream-100 bg-cream-50">
        <button 
          onClick={handleReset}
          className="text-xs font-semibold text-sage-600 hover:text-sage-800 transition-colors w-full text-center py-1"
        >
          Reset all filters
        </button>
      </div>
    </div>
  );
}
