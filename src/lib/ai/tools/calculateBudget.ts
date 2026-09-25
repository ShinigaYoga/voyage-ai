import { ToolDefinition } from "./types";

export const calculateBudgetTool: ToolDefinition = {
  name: 'calculateBudget',
  description: 'Calculates and summarizes the estimated budget breakdown for the trip.',
  parameters: {
    type: 'object',
    properties: {
      tripId: { type: 'string', description: 'Trip ID to calculate budget for' },
    },
  },
  execute: async (args, ctx) => {
    const id = args.tripId || ctx.tripId;
    const trip = id ? await ctx.tripRepository.get(id) : ctx.currentTrip;

    const baseBudget = trip?.budget ? parseInt(trip.budget.replace(/[^0-9]/g, "")) || 25000 : 25000;
    const travelers = trip?.travelers || 2;

    const breakdown = {
      stayEstimate: Math.round(baseBudget * 0.45),
      activitiesEstimate: Math.round(baseBudget * 0.30),
      foodEstimate: Math.round(baseBudget * 0.25),
      transportEstimate: 0,
      totalEstimated: baseBudget,
      travelersCount: travelers,
      perPersonEstimate: Math.round(baseBudget / travelers),
    };

    return {
      result: { breakdown, summary: `Total estimated budget is ₹${baseBudget.toLocaleString('en-IN')} for ${travelers} travelers (₹${breakdown.perPersonEstimate.toLocaleString('en-IN')}/person).` },
    };
  },
};
