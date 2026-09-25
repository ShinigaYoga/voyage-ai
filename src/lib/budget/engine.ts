import { Trip, BudgetBreakdown, ActivityCategory } from '../types';

const CATEGORY_BUCKET: Record<ActivityCategory, keyof Omit<BudgetBreakdown, 'total' | 'budget' | 'remaining' | 'status' | 'transport' | 'hotel'>> = {
  food: 'food',
  culture: 'activities',
  nature: 'activities',
  nightlife: 'activities',
  rest: 'activities',
  shopping: 'other',
  transport: 'localTransport',
};

export function calculateBudgetBreakdown(trip: Trip): BudgetBreakdown {
  const budgetNum = parseBudget(trip.budget);
  const travelers = trip.travelers || 1;
  const days = trip.itinerary?.days ?? [];

  let food = 0;
  let activities = 0;
  let localTransport = 0;
  let other = 0;

  for (const day of days) {
    for (const act of day.activities) {
      const bucket = CATEGORY_BUCKET[act.category] ?? 'other';
      const cost = act.price * travelers;
      if (bucket === 'food') food += cost;
      else if (bucket === 'activities') activities += cost;
      else if (bucket === 'localTransport') localTransport += cost;
      else other += cost;
    }
  }

  let transport = trip.transport ? trip.transport.price * travelers : 0;
  let hotel = 0;

  if (trip.bookings) {
    for (const b of trip.bookings) {
      if (b.status === 'confirmed') {
        const cost = b.price; // assuming price is total
        if (b.itemType === 'hotel') hotel += cost;
        else if (b.itemType === 'flight' || b.itemType === 'train' || b.itemType === 'bus') transport += cost;
        else if (b.itemType === 'restaurant') food += cost;
        else if (b.itemType === 'activity') activities += cost;
        else other += cost;
      }
    }
  }

  const total = food + activities + localTransport + other + transport + hotel;
  const remaining = budgetNum - total;

  let status: BudgetBreakdown['status'];
  if (budgetNum === 0) {
    status = 'under';
  } else {
    const ratio = total / budgetNum;
    status = ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'under';
  }

  return { transport, hotel, food, activities, localTransport, other, total, budget: budgetNum, remaining, status };
}

function parseBudget(budget?: string): number {
  if (!budget) return 0;
  const num = parseInt(budget.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}
