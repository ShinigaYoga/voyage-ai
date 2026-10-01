import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Trip } from "@/lib/types";

interface TripSelectorProps {
  currentTrip?: Trip;
  trips: Trip[];
  onSelect: (tripId: string) => void;
  onCreateNew: () => void;
}

export function TripSelector({ currentTrip, trips, onSelect, onCreateNew }: TripSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="flex items-center gap-2 bg-cream-50 hover:bg-cream-200 px-4 py-2 rounded-pill transition-colors text-ink-900 font-medium text-sm border border-cream-200"
      >
        <span>🌍</span>
        <span className="truncate max-w-[120px] md:max-w-[200px]">
          {currentTrip ? currentTrip.name : "Select Trip"}
        </span>
        <span className="text-ink-500 font-normal">
          {currentTrip?.travelers ? `· ${currentTrip.travelers}` : ""}
        </span>
        <ChevronDown size={16} className={`text-ink-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white  rounded-cardLg shadow-float border border-cream-200 z-50 overflow-hidden py-2">
            <div className="max-h-60 overflow-y-auto">
              {trips.map(trip => (
                <button
                  key={trip.id}
                  className={`w-full text-left px-4 py-3 hover:bg-cream-100 transition-colors flex items-center gap-3 ${
                    currentTrip?.id === trip.id ? "bg-sage-50" : ""
                  }`}
                  onClick={() => {
                    onSelect(trip.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-xl">🌍</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-900 truncate">{trip.name}</div>
                    <div className="text-xs text-ink-500 truncate">{trip.destination}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="px-2 pt-2 border-t border-cream-200 mt-2">
              <button
                className="w-full text-left px-3 py-2 rounded-xl text-sage-700 font-medium hover:bg-sage-50 transition-colors flex items-center gap-2"
                onClick={() => {
                  onCreateNew();
                  setIsOpen(false);
                }}
              >
                <div className="bg-sage-100 p-1 rounded-full"><Plus size={16} /></div>
                Start a new trip
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
