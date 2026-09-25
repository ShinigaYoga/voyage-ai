import React from "react";
import { EmptyStateIllustration } from "../illustrations/EmptyStateIllustration";
import { Button } from "../ui/Button";

export function TripsEmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 pt-12 max-w-md mx-auto">
      <EmptyStateIllustration className="mb-6" />
      <h2 className="font-display font-bold text-2xl text-ink-900 mb-2">No trips yet</h2>
      <p className="text-ink-600 mb-6 text-sm leading-relaxed max-w-sm">
        Your handcrafted itineraries, booked stays, custom routes, and travel forecasts will live here once you start planning with your Voyage Companion AI agent.
      </p>

      <div className="bg-cream-50 p-4 rounded-card border border-cream-200 text-xs text-ink-500 mb-6 text-left w-full space-y-2">
        <div className="font-semibold text-ink-800">Quick start options:</div>
        <div>• Ask AI: "Plan a 4-day trip to Goa under ₹25,000"</div>
        <div>• Ask AI: "Organize a Himalayan trek for 2 travelers"</div>
      </div>

      <Button variant="accent" onClick={onCreateTrip}>Plan a trip &rarr;</Button>
    </div>
  );
}
