import { TransportOption, TransportSearchParams } from "./types";

export function scoreOptions(
  options: TransportOption[],
  preferences: {
    budget?: number;
    preferredModes?: Array<'flight' | 'train' | 'bus'>;
  } = {}
): TransportOption[] {
  if (options.length === 0) return [];

  const minPrice = Math.min(...options.map(o => o.price));
  const maxPrice = Math.max(...options.map(o => o.price)) || minPrice + 1;
  const minDuration = Math.min(...options.map(o => o.durationMinutes));
  const maxDuration = Math.max(...options.map(o => o.durationMinutes)) || minDuration + 1;

  const scored = options.map(opt => {
    // Price score (40%): lower is better
    const priceScore = 100 - ((opt.price - minPrice) / (maxPrice - minPrice)) * 100;
    
    // Duration score (40%): shorter is better
    const durationScore = 100 - ((opt.durationMinutes - minDuration) / (maxDuration - minDuration)) * 100;

    // Mode score (20%)
    let modeScore = 50;
    if (preferences.preferredModes && preferences.preferredModes.length > 0) {
      modeScore = preferences.preferredModes.includes(opt.mode) ? 100 : 20;
    }

    const totalScore = Math.round(priceScore * 0.4 + durationScore * 0.4 + modeScore * 0.2);

    let reason: string | undefined = undefined;
    if (opt.price === minPrice) {
      reason = "Cheapest";
    } else if (opt.durationMinutes === minDuration) {
      reason = "Fastest";
    }

    return {
      ...opt,
      score: totalScore,
      recommendationReason: reason,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  // If the top scored item doesn't have a reason yet, set Best value
  if (scored.length > 0 && !scored[0].recommendationReason) {
    scored[0].recommendationReason = "Best value";
  }

  return scored;
}
