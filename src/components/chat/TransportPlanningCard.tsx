import React, { useState } from "react";
import { TransportPlan, TrendPoint } from "@/lib/services/transport/planningTypes";
import { Card } from "@/components/ui/Card";

interface TransportPlanningCardProps {
  origin: string;
  destination: string;
  departureDate: string;
  plans: TransportPlan[];
}

export function TransportPlanningCard({ origin, destination, departureDate, plans }: TransportPlanningCardProps) {
  const [selectedMode, setSelectedMode] = useState<"all" | "flight" | "train" | "bus">("all");

  if (!plans || plans.length === 0) return null;

  // Find overall lowest price plan for ribbon
  const lowestPlan = plans.reduce((prev, curr) => (curr.priceRange.min < prev.priceRange.min ? curr : prev), plans[0]);
  const bestMode = lowestPlan.mode;

  const modeIcons = {
    flight: "✈️ Flight",
    train: "🚆 Train",
    bus: "🚌 Bus"
  };

  const getTrendIcon = (direction: string) => {
    if (direction === "rising") return "↗ Rising";
    if (direction === "falling") return "↘ Falling";
    if (direction === "u-shaped") return "∪ U-shaped";
    return "→ Flat";
  };

  const filteredPlans = selectedMode === "all" ? plans : plans.filter(p => p.mode === selectedMode);
  
  // A naive countdown chip for the best plan
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depDate = new Date(departureDate);
  depDate.setHours(0, 0, 0, 0);
  const daysToDeparture = Math.floor((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  let countdownMsg = "";
  if (daysToDeparture > 90) countdownMsg = `Lower-price window opens in ~${daysToDeparture - 90} days`;
  else if (daysToDeparture > 30) countdownMsg = "You are in the lower-price window";
  else countdownMsg = "Book now – prices likely rising";

  return (
    <div className="w-full max-w-sm mt-2 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-display font-bold text-ink-900">Plan your transport</h3>
          <p className="text-xs text-ink-500">{origin} → {destination} • {new Date(departureDate).toLocaleDateString()}</p>
        </div>
        <span className="px-2 py-1 bg-sage-100 text-sage-800 rounded-full font-bold text-[10px] uppercase tracking-wider">Estimated</span>
      </div>

      {/* Hero Insight Card */}
      <Card className="p-4 mb-4 bg-sage-50 border border-sage-200">
        <h4 className="font-bold text-sage-800 text-sm mb-1">Estimated lower-price window</h4>
        <p className="text-sm font-medium text-sage-700">
          {lowestPlan.lowerPriceWindow.start} – {lowestPlan.lowerPriceWindow.end}
        </p>
        <p className="text-[10px] text-sage-600 mt-2 opacity-80">
          {countdownMsg}
        </p>
      </Card>

      <div className="text-[10px] text-ink-400 mb-4 text-center italic">
        Fares change. Not live prices. No guaranteed cheapest date.
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4 bg-cream-100 p-1 rounded-lg">
        <button 
          onClick={() => setSelectedMode("all")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${selectedMode === "all" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
        >
          All
        </button>
        {plans.map(p => (
          <button 
            key={p.mode}
            onClick={() => setSelectedMode(p.mode)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${selectedMode === p.mode ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
          >
            {modeIcons[p.mode]}
          </button>
        ))}
      </div>

      {/* Price Trend Visualization (SVG) */}
      <div className="mb-4 h-32 w-full bg-cream-50 rounded-card border border-cream-200 p-2 relative">
        <div className="text-[10px] text-ink-400 font-bold mb-1">Price Trend {selectedMode !== 'all' ? `(${selectedMode})` : ''}</div>
        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-label="Estimated price trend chart">
          {/* Timeline background */}
          <line x1="0" y1="35" x2="100" y2="35" stroke="#E5E0D8" strokeWidth="0.5" />
          
          {filteredPlans.map((plan, i) => {
            if (plan.trend.length < 2) return null;
            const maxVal = Math.max(...plan.trend.map(t => t.estimate)) * 1.1;
            const minVal = Math.min(...plan.trend.map(t => t.estimate)) * 0.9;
            const range = maxVal - minVal || 1;
            
            // Map trend points to X/Y
            const points = plan.trend.map((t, idx) => {
              const x = (idx / (plan.trend.length - 1)) * 100;
              const y = 30 - ((t.estimate - minVal) / range) * 25;
              return { x, y, est: t.estimate, label: t.milestone };
            });

            const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
            const color = plan.mode === 'flight' ? '#0ea5e9' : plan.mode === 'train' ? '#6366f1' : '#f59e0b';
            
            return (
              <g key={plan.mode}>
                {/* Line */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" className="opacity-80" />
                {/* Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="1.5" fill={color} />
                    {selectedMode !== 'all' && (
                      <text x={p.x} y={p.y - 3} fontSize="3" fill="#6B655C" textAnchor="middle" fontWeight="bold">
                        ₹{p.est.toLocaleString()}
                      </text>
                    )}
                    {selectedMode !== 'all' && (
                      <text x={p.x} y="38" fontSize="3" fill="#999288" textAnchor={idx === 0 ? "start" : idx === points.length - 1 ? "end" : "middle"}>
                        {p.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Transport Cards */}
      <div className="space-y-3">
        {filteredPlans.map(plan => (
          <Card key={plan.mode} className="relative overflow-hidden">
            {bestMode === plan.mode && (
              <div className="absolute top-0 right-0 bg-sage-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                Best Value
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-ink-900 text-sm">{modeIcons[plan.mode]}</span>
                <span className="text-[10px] bg-cream-200 px-1.5 py-0.5 rounded text-ink-600 font-medium">
                  {getTrendIcon(plan.trendDirection)}
                </span>
                {plan.availability !== 'unknown' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${plan.availability === 'available' ? 'bg-sage-100 text-sage-700' : 'bg-amber-100 text-amber-700'}`}>
                    {plan.availability}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-end mt-1">
                <div className="text-xs text-ink-500">
                  <div>Duration: ~{plan.duration}</div>
                  <div>Window: {plan.bookingWindow.start} – {plan.bookingWindow.end}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink-400 font-bold uppercase">Est. Range</div>
                  <div className="font-display font-bold text-lg text-ink-900">
                    ₹{plan.priceRange.min.toLocaleString()} - ₹{plan.priceRange.max.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
