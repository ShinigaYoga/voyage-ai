import React from "react";
import { EmptyStateIllustration } from "../illustrations/EmptyStateIllustration";
import { QuickPromptChips } from "./QuickPromptChips";
import { Trip } from "@/lib/types";

export function ChatEmptyState({
  onQuickPrompt,
  currentTrip,
}: {
  onQuickPrompt?: (text: string) => void;
  currentTrip?: Trip;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 w-full max-w-md mx-auto">
      <EmptyStateIllustration className="mb-6" />
      <h2 className="font-display font-bold text-xl text-ink-900 mb-2">
        {currentTrip
          ? `Continuing your ${currentTrip.destination} trip`
          : "Your Voyage Companion is ready"}
      </h2>
      <p className="text-ink-500 text-sm max-w-[280px]">
        {currentTrip
          ? "Ask anything about your itinerary, budget, or transport."
          : "Tell me where you're dreaming of and I'll plan the rest."}
      </p>

      <div className="w-full mt-4">
        <QuickPromptChips onSelect={onQuickPrompt} currentTrip={currentTrip} />
      </div>
    </div>
  );
}
