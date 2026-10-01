import { ToolDefinition } from "./types";
import { calculateBudgetBreakdown, adjustItineraryForBudget, parseBudgetValue } from "@/lib/budget/engine";

export const calculateBudgetTool: ToolDefinition = {
  name: 'calculateBudget',
  description: 'Calculates and summarizes the estimated budget breakdown for the trip.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to calculate budget for' },
      newBudget: { type: 'number', description: 'Optional new budget amount in INR to apply to the trip' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    let trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;

    if (!trip) {
      throw new Error("No active trip found to calculate budget for.");
    }

    if (typeof args.newBudget === 'number' && args.newBudget > 0) {
      trip.budget = `₹${args.newBudget.toLocaleString('en-IN')}`;
    }

    const { updatedTrip, adjustments, breakdown } = adjustItineraryForBudget(trip, trip.destinationProfile);
    await ctx.tripRepository.upsert(updatedTrip);
    ctx.currentTrip = updatedTrip;

    const budgetVal = parseBudgetValue(updatedTrip.budget);
    const isOver = breakdown.status === 'over';
    const statusText = isOver
      ? `Over budget by ₹${Math.abs(breakdown.remaining).toLocaleString('en-IN')}`
      : `₹${breakdown.remaining.toLocaleString('en-IN')} remaining`;

    const summaryLines = [
      `💰 Budget Estimate for ${updatedTrip.destination} (${updatedTrip.travelers} traveler${updatedTrip.travelers > 1 ? 's' : ''}):`,
      `Total estimated cost is ₹${breakdown.total.toLocaleString('en-IN')}${budgetVal > 0 ? ` of ₹${budgetVal.toLocaleString('en-IN')} (${statusText})` : ''}.`,
      adjustments.length > 0 ? `Adjustments: ${adjustments.join(' ')}` : `Your plan fits comfortably within your budget limits.`
    ];

    return {
      result: {
        breakdown,
        adjustments,
        summary: summaryLines.join('\n'),
      },
    };
  },
};
