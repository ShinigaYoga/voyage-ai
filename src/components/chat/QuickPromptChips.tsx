import React from "react";
import { Trip } from "@/lib/types";

interface QuickPromptChipsProps {
  onSelect?: (text: string) => void;
  prompts?: string[];
  currentTrip?: Trip;
}

const defaultPrompts = [
  "🌴 Goa for 4 days under ₹25,000",
  "🏔 Manali trek for 2 people",
  "🚆 Compare trains and flights to Kerala"
];

export function QuickPromptChips({ onSelect, prompts, currentTrip }: QuickPromptChipsProps) {
  const activePrompts = prompts ?? (currentTrip ? [
    `📅 What's on Day 2?`,
    `💰 What's my current budget status?`,
    `🚆 Compare flights and trains to ${currentTrip.destination}`,
  ] : defaultPrompts);

  return (
    <div className="flex flex-col gap-3 mt-6 items-center w-full max-w-sm mx-auto">
      {activePrompts.map((prompt, i) => (
        <button
          key={i}
          className="w-full text-left px-5 py-3 rounded-pill bg-cream-100 dark:bg-cream-200 border border-cream-200 text-sm font-medium text-ink-700 shadow-sm hover:shadow-soft hover:border-sage-300 transition-all active:scale-[0.99]"
          onClick={() => onSelect?.(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
