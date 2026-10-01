import { Trip, Day, Activity, BudgetBreakdown } from '../types';
import { DestinationProfile, DestinationAttraction } from '../services/destination/types';

export const BUDGET_CONFIG = {
  tiers: {
    budget: { accommodationPerNightPerPerson: 1000, foodPerPersonPerDay: 600, localTransportPerDay: 300 },
    mid: { accommodationPerNightPerPerson: 2500, foodPerPersonPerDay: 1200, localTransportPerDay: 600 },
    luxury: { accommodationPerNightPerPerson: 6000, foodPerPersonPerDay: 2500, localTransportPerDay: 1500 },
  }
};

export type BudgetTier = 'budget' | 'mid' | 'luxury';

export interface BudgetEstimateResult {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
  localTransport: number;
  other: number;
  total: number;
  budget: number;
  remaining: number;
  status: 'under' | 'tight' | 'over';
  isEstimate: true;
  tier: BudgetTier;
  suggestions: string[];
}

export function parseBudgetValue(budget?: string | number): number {
  if (typeof budget === 'number') return budget;
  if (!budget) return 0;
  const num = parseInt(budget.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function estimateBudget(
  itinerary: { days: Day[] } | undefined,
  travelers: number = 1,
  daysCount: number = 3,
  budgetValue: number = 0,
  tier: BudgetTier = 'mid'
): BudgetEstimateResult {
  const travelersNum = Math.max(1, travelers);
  const daysNum = Math.max(1, daysCount);
  const tierConfig = BUDGET_CONFIG.tiers[tier] || BUDGET_CONFIG.tiers.mid;

  let activitiesCost = 0;
  let foodCostFromActivities = 0;

  if (itinerary?.days) {
    for (const day of itinerary.days) {
      for (const act of day.activities || []) {
        const cost = (act.price || 0) * travelersNum;
        if (act.category === 'food') {
          foodCostFromActivities += cost;
        } else {
          activitiesCost += cost;
        }
      }
    }
  }

  const baseFoodCost = tierConfig.foodPerPersonPerDay * travelersNum * daysNum;
  const foodCost = Math.max(baseFoodCost, foodCostFromActivities);
  const nights = Math.max(1, daysNum - 1);
  const accommodationCost = tierConfig.accommodationPerNightPerPerson * travelersNum * nights;
  const localTransportCost = tierConfig.localTransportPerDay * daysNum;

  const total = accommodationCost + foodCost + activitiesCost + localTransportCost;
  const remaining = budgetValue > 0 ? budgetValue - total : 0;

  let status: 'under' | 'tight' | 'over' = 'under';
  if (budgetValue > 0) {
    const ratio = total / budgetValue;
    if (ratio > 1.0) status = 'over';
    else if (ratio >= 0.85) status = 'tight';
    else status = 'under';
  }

  const suggestions: string[] = [];
  if (budgetValue === 0) {
    suggestions.push(`Estimated total cost: ₹${total.toLocaleString('en-IN')} (${tier} tier). Set a budget to get custom adjustments.`);
  } else if (status === 'over') {
    const overBy = Math.abs(remaining);
    suggestions.push(`Estimated over budget by ₹${overBy.toLocaleString('en-IN')}.`);
    suggestions.push(`• Switch accommodation to a more budget-friendly tier.`);
    suggestions.push(`• Swap paid activities for free/low-cost local attractions.`);
  } else if (status === 'tight') {
    const buffer = Math.round(remaining * 0.5);
    suggestions.push(`Estimated cost is tight against budget (₹${remaining.toLocaleString('en-IN')} buffer).`);
    suggestions.push(`• Keep ₹${buffer.toLocaleString('en-IN')} as buffer for local transport or incidentals.`);
  } else {
    suggestions.push(`Estimated cost: ₹${total.toLocaleString('en-IN')} — ₹${remaining.toLocaleString('en-IN')} remaining.`);
    suggestions.push(`• Budget looks comfortable! You have room for premium dining or extra activities.`);
  }

  return {
    accommodation: accommodationCost,
    food: foodCost,
    transport: 0,
    activities: activitiesCost,
    localTransport: localTransportCost,
    other: 0,
    total,
    budget: budgetValue,
    remaining,
    status,
    isEstimate: true,
    tier,
    suggestions,
  };
}

export function calculateBudgetBreakdown(trip: Trip): BudgetBreakdown {
  const budgetNum = parseBudgetValue(trip.budget);
  const travelers = trip.travelers || 1;
  const days = trip.itinerary?.days ?? [];
  const daysCount = Math.max(1, days.length || 3);

  const estimate = estimateBudget(trip.itinerary, travelers, daysCount, budgetNum, 'mid');

  let transportCost = trip.transport ? (trip.transport.price || 0) * travelers : 0;
  let hotelCost = estimate.accommodation;
  let foodCost = estimate.food;
  let activitiesCost = estimate.activities;
  let localTransportCost = estimate.localTransport;
  let otherCost = 0;

  if (trip.bookings) {
    for (const b of trip.bookings) {
      if (b.status === 'confirmed') {
        const cost = b.price || 0;
        if (b.itemType === 'hotel') hotelCost = cost;
        else if (b.itemType === 'flight' || b.itemType === 'train' || b.itemType === 'bus') transportCost = cost;
        else if (b.itemType === 'restaurant') foodCost += cost;
        else if (b.itemType === 'activity') activitiesCost += cost;
        else otherCost += cost;
      }
    }
  }

  const total = transportCost + hotelCost + foodCost + activitiesCost + localTransportCost + otherCost;
  const remaining = budgetNum - total;

  let status: BudgetBreakdown['status'] = 'under';
  if (budgetNum > 0) {
    const ratio = total / budgetNum;
    status = ratio > 1 ? 'over' : ratio >= 0.85 ? 'near' : 'under';
  }

  return {
    transport: transportCost,
    hotel: hotelCost,
    food: foodCost,
    activities: activitiesCost,
    localTransport: localTransportCost,
    other: otherCost,
    total,
    budget: budgetNum,
    remaining,
    status,
  };
}

export function generateBudgetRecommendations(breakdown: BudgetBreakdown): string[] {
  const recs: string[] = [];
  const { total, budget, remaining, status } = breakdown;

  if (budget === 0) {
    recs.push('No budget set — all prices are estimates. Set a budget to receive tailored recommendations.');
    return recs;
  }

  if (status === 'over') {
    const overBy = Math.abs(remaining);
    recs.push(`Estimated over budget by ₹${overBy.toLocaleString('en-IN')}. Suggested adjustments:`);
    recs.push('• Consider budget-tier stays or fewer nights for immediate savings.');
    recs.push('• Swap paid activities for free/low-cost local attractions.');
  } else if (status === 'near') {
    recs.push(`Estimated total ₹${total.toLocaleString('en-IN')} — ₹${Math.max(0, remaining).toLocaleString('en-IN')} remaining.`);
    recs.push('• Your plan fits closely within budget. Keep a small buffer for unexpected local travel.');
  } else {
    recs.push(`Estimated total ₹${total.toLocaleString('en-IN')} — ₹${remaining.toLocaleString('en-IN')} remaining.`);
    recs.push('• Your plan is comfortably within budget! You can add extra experiences or upgrade dining.');
  }

  return recs;
}

export function adjustItineraryForBudget(
  trip: Trip,
  profile?: DestinationProfile
): {
  updatedTrip: Trip;
  adjustments: string[];
  breakdown: BudgetBreakdown;
  isOver: boolean;
} {
  const budgetNum = parseBudgetValue(trip.budget);
  if (!budgetNum || !trip.itinerary?.days) {
    const breakdown = calculateBudgetBreakdown(trip);
    return { updatedTrip: trip, adjustments: [], breakdown, isOver: false };
  }

  const travelers = trip.travelers || 1;
  const daysCount = trip.itinerary.days.length;
  const adjustments: string[] = [];

  let currentDays: Day[] = JSON.parse(JSON.stringify(trip.itinerary.days));
  let currentTier: BudgetTier = 'mid';

  const researchedAttractions: DestinationAttraction[] = profile?.attractions || [];
  const freeAlternatives = researchedAttractions.filter(
    (a) => (a.entryFeeINR === 0 || a.entryFeeINR < 200) && (a.popularityScore ?? 0) >= 5
  );

  let pass = 0;
  const maxPasses = 3;

  while (pass < maxPasses) {
    pass++;
    const currentEstimate = estimateBudget({ days: currentDays }, travelers, daysCount, budgetNum, currentTier);

    if (currentEstimate.total <= budgetNum) {
      break;
    }

    if (pass === 1) {
      if ((currentTier as string) === 'luxury') {
        currentTier = 'mid';
        adjustments.push('Switched accommodation tier from luxury to mid-range.');
      } else if (currentTier === 'mid') {
        currentTier = 'budget';
        adjustments.push('Switched accommodation tier from mid-range to budget stays.');
      }
    } else if (pass === 2) {
      let activitySwapped = false;
      for (const day of currentDays) {
        for (let i = 0; i < day.activities.length; i++) {
          const act = day.activities[i];
          const isMajor = act.price > 1000 || (act.category === 'culture' && (act.name.toLowerCase().includes('taj mahal') || act.name.toLowerCase().includes('fort') || act.name.toLowerCase().includes('gate')));
          if (act.price > 300 && !isMajor) {
            const existingNames = new Set(currentDays.flatMap((d) => d.activities.map((a) => a.name.toLowerCase())));
            const alt = freeAlternatives.find((a) => !existingNames.has(a.name.toLowerCase()));

            if (alt) {
              const oldName = act.name;
              day.activities[i] = {
                ...act,
                name: alt.name,
                description: alt.description,
                price: alt.entryFeeINR || 0,
                category: (alt.category as any) || 'culture',
              };
              adjustments.push(`Replaced paid activity "${oldName}" with free site "${alt.name}".`);
              activitySwapped = true;
              break;
            } else {
              const oldPrice = act.price;
              act.price = 0;
              adjustments.push(`Adjusted "${act.name}" to free public self-guided visit (saved ₹${(oldPrice * travelers).toLocaleString('en-IN')}).`);
              activitySwapped = true;
              break;
            }
          }
        }
        if (activitySwapped) break;
      }
    } else if (pass === 3) {
      let foodAdjusted = false;
      for (const day of currentDays) {
        for (const act of day.activities) {
          if (act.category === 'food' && act.price > 200) {
            const oldPrice = act.price;
            act.price = 150;
            adjustments.push(`Selected budget-friendly dining spot for "${act.name}" (saved ₹${((oldPrice - 150) * travelers).toLocaleString('en-IN')}).`);
            foodAdjusted = true;
            break;
          }
        }
        if (foodAdjusted) break;
      }
    }
  }

  const finalItinerary = { days: currentDays };
  const finalEstimate = estimateBudget(finalItinerary, travelers, daysCount, budgetNum, currentTier);

  const breakdown: BudgetBreakdown = {
    transport: trip.transport ? (trip.transport.price || 0) * travelers : 0,
    hotel: finalEstimate.accommodation,
    food: finalEstimate.food,
    activities: finalEstimate.activities,
    localTransport: finalEstimate.localTransport,
    other: 0,
    total: finalEstimate.total,
    budget: budgetNum,
    remaining: finalEstimate.remaining,
    status: finalEstimate.status === 'over' ? 'over' : finalEstimate.status === 'tight' ? 'near' : 'under',
  };

  const isOver = breakdown.status === 'over';
  if (isOver) {
    const overBy = Math.abs(breakdown.remaining);
    adjustments.push(`Plan is over budget by ₹${overBy.toLocaleString('en-IN')} (major attractions preserved).`);
  }

  const updatedTrip: Trip = {
    ...trip,
    itinerary: finalItinerary,
    budgetBreakdown: breakdown,
    budgetRecommendations: generateBudgetRecommendations(breakdown),
  };

  return { updatedTrip, adjustments, breakdown, isOver };
}
