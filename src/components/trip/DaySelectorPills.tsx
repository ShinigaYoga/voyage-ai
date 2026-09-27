"use client";

import React, { useRef, useEffect } from "react";

interface DaySelectorPillsProps {
  days: { dayIndex: number; date?: string }[];
  activeDay: number;
  onSelect: (dayIndex: number) => void;
}

export function DaySelectorPills({ days, activeDay, onSelect }: DaySelectorPillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll active pill into view
    if (containerRef.current) {
      const activeElement = containerRef.current.children[activeDay] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeDay]);

  return (
    <div 
      ref={containerRef}
      className="flex gap-3 overflow-x-auto pb-4 pt-2 px-4 md:px-0 hide-scrollbar snap-x"
    >
      {days.map((day) => {
        const isActive = day.dayIndex === activeDay;
        
        // Format date if available
        let subtitle = "";
        if (day.date) {
          const d = new Date(day.date);
          subtitle = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        }

        return (
          <button
            key={day.dayIndex}
            onClick={() => onSelect(day.dayIndex)}
            className={`
              flex-shrink-0 snap-start flex flex-col items-center justify-center 
              w-20 h-20 rounded-2xl border transition-all duration-300
              ${isActive 
                ? 'bg-sage-600 border-sage-700 shadow-md text-white scale-105' 
                : 'bg-white dark:bg-cream-200 border-cream-200 text-ink-700 hover:border-sage-300 hover:bg-sage-50 dark:hover:bg-sage-900/30'
              }
            `}
          >
            <span className={`text-sm font-bold ${isActive ? 'text-sage-100' : 'text-ink-400'}`}>
              Day {day.dayIndex + 1}
            </span>
            {subtitle && (
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-white' : 'text-ink-600'}`}>
                {subtitle}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
