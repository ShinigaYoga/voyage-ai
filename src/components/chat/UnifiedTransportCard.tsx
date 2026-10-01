"use client";

import React, { useState, useEffect } from "react";
import { TransportPlan, TrendPoint } from "@/lib/services/transport/planningTypes";
import { TransportOption } from "@/lib/services/transport/types";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { Clock, Info } from "lucide-react";

interface UnifiedTransportCardProps {
  origin: string;
  destination: string;
  departureDate?: string;
  plans?: TransportPlan[];
  options: TransportOption[];
  tripId?: string;
}

export function UnifiedTransportCard({ origin, destination, departureDate, plans, options, tripId }: UnifiedTransportCardProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<"all" | "flight" | "train" | "bus">("all");
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Parse dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let depDate: Date | null = null;
  let daysToDeparture = 0;
  
  if (departureDate) {
    depDate = new Date(departureDate);
    depDate.setHours(0, 0, 0, 0);
    daysToDeparture = Math.floor((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isFarFuture = daysToDeparture >= 7;

  // Filter options based on mode
  const filteredOptions = selectedMode === "all" ? options : options.filter(o => o.mode === selectedMode);
  
  // Sort options by score or price
  const sortedOptions = [...filteredOptions].sort((a, b) => a.price - b.price);

  // Compare stats
  const byPrice = [...options].sort((a, b) => a.price - b.price);
  const byDuration = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes);
  const cheapest = byPrice[0];
  const fastest = byDuration[0];
  const priceDelta = cheapest && fastest && cheapest.id !== fastest.id ? Math.abs(fastest.price - cheapest.price) : null;
  const timeDeltaMins = cheapest && fastest && cheapest.id !== fastest.id ? Math.abs(cheapest.durationMinutes - fastest.durationMinutes) : null;

  const modeIcons = {
    flight: "✈️ Flight",
    train: "🚆 Train",
    bus: "🚌 Bus"
  };

  const getTrendIcon = (direction?: string) => {
    if (direction === "rising") return "↗ Rising";
    if (direction === "falling") return "↘ Falling";
    if (direction === "u-shaped") return "∪ U-shaped";
    return "→ Flat";
  };

  const handleSelectOption = async (option: TransportOption) => {
    if (!tripId || selectingId) return;
    setSelectingId(option.id);
    try {
      const params = new URLSearchParams({
        mode: option.mode,
        provider: option.provider,
        departure: option.departureCity,
        arrival: option.arrivalCity,
        depTime: option.departureTime,
        arrTime: option.arrivalTime,
        price: option.price.toString()
      });
      if (departureDate) params.append("date", departureDate);
      router.push(`/trip/${tripId}/transport/book?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setSelectingId(null);
    }
  };

  // Find lowest plan for insights
  const lowestPlan = plans && plans.length > 0 
    ? plans.reduce((prev, curr) => (curr.priceRange.min < prev.priceRange.min ? curr : prev), plans[0])
    : null;

  let countdownMsg = "";
  if (lowestPlan && isFarFuture) {
    if (daysToDeparture > 90) countdownMsg = `Lower-price window opens in ~${daysToDeparture - 90} days`;
    else if (daysToDeparture > 30) countdownMsg = "You are in the lower-price window";
    else countdownMsg = "Book now – prices likely rising";
  }

  // Calculate max price across all plans for the SVG scale
  const maxPriceAllPlans = plans ? Math.max(...plans.flatMap(p => p.trend.map(t => t.estimate))) * 1.1 : 1;
  const minPriceAllPlans = plans ? Math.min(...plans.flatMap(p => p.trend.map(t => t.estimate))) * 0.9 : 0;
  const priceRange = maxPriceAllPlans - minPriceAllPlans || 1;

  return (
    <div className="w-full max-w-sm mt-2 animate-in fade-in slide-in-from-bottom-4">
      {/* Header Card */}
      <Card className="p-3 mb-3 bg-cream-50 border border-cream-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display font-bold text-ink-900 text-lg">{origin} → {destination}</h3>
            {departureDate && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-ink-600 bg-cream-200 px-2 py-0.5 rounded-full">
                  {new Date(departureDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-ink-500 font-semibold uppercase tracking-wide">
                  {daysToDeparture > 0 ? `${daysToDeparture} days to go` : daysToDeparture === 0 ? "Today" : "Past"}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Insight Hero & Timeline (Only if far future and plans exist) */}
      {isFarFuture && lowestPlan && plans && (
        <>
          <Card className="p-4 mb-3 bg-sage-50 border border-sage-200">
            <h4 className="font-bold text-sage-800 text-sm mb-1">Estimated lower-price window</h4>
            <p className="text-sm font-medium text-sage-700">
              Typically {lowestPlan.lowerPriceWindow.start} – {lowestPlan.lowerPriceWindow.end}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-sage-100 text-sage-800 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
              {countdownMsg}
            </div>
          </Card>

          {/* Stepper Timeline */}
          <div className="mb-4 px-2">
            <div className="relative flex justify-between text-[9px] text-ink-500 font-bold uppercase tracking-wider">
              {/* Background line */}
              <div className="absolute top-2 left-0 right-0 h-0.5 bg-cream-200 -z-10"></div>
              {/* Lower price window highlight line */}
              {daysToDeparture > 30 && (
                <div className="absolute top-2 left-[25%] right-[25%] h-0.5 bg-sage-400 shadow-[0_0_8px_rgba(74,159,134,0.6)] -z-10"></div>
              )}
              
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full mb-1 flex items-center justify-center ${daysToDeparture >= 120 ? 'bg-sage-500 text-white' : 'bg-cream-200'}`}>
                  {daysToDeparture >= 120 && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span>6mo</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full mb-1 flex items-center justify-center ${daysToDeparture < 120 && daysToDeparture >= 60 ? 'bg-sage-500 text-white' : 'bg-cream-200'}`}>
                  {daysToDeparture < 120 && daysToDeparture >= 60 && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span>3mo</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full mb-1 flex items-center justify-center ${daysToDeparture < 60 && daysToDeparture >= 14 ? 'bg-sage-500 text-white' : 'bg-cream-200'}`}>
                  {daysToDeparture < 60 && daysToDeparture >= 14 && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span>1mo</span>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full mb-1 flex items-center justify-center ${daysToDeparture < 14 ? 'bg-sage-500 text-white' : 'bg-cream-200'}`}>
                  {daysToDeparture < 14 && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span>Dep</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-3 bg-cream-100 p-1 rounded-lg">
        <button 
          onClick={() => setSelectedMode("all")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${selectedMode === "all" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
        >
          All
        </button>
        {Array.from(new Set(options.map(o => o.mode))).map(mode => (
          <button 
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${selectedMode === mode ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
          >
            {modeIcons[mode]}
          </button>
        ))}
      </div>

      {/* Price Trend Chart (Only if plans exist and far future) */}
      {isFarFuture && plans && plans.length > 0 && (
        <div className="mb-4 h-32 w-full bg-cream-50 rounded-card border border-cream-200 p-2 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-[10px] text-ink-500 font-bold uppercase tracking-wide">
            Est. Price Trend {selectedMode !== 'all' ? `(${selectedMode})` : ''}
          </div>
          <svg viewBox="0 0 100 40" className="w-full h-full pt-4" preserveAspectRatio="none" aria-label="Price trend chart">
            <line x1="0" y1="35" x2="100" y2="35" stroke="#E5E0D8" strokeWidth="0.5" />
            
            {(selectedMode === "all" ? plans : plans.filter(p => p.mode === selectedMode)).map(plan => {
              if (plan.trend.length < 2) return null;
              
              const points = plan.trend.map((t, idx) => {
                const x = (idx / (plan.trend.length - 1)) * 100;
                const y = 30 - ((t.estimate - minPriceAllPlans) / priceRange) * 25;
                return { x, y, est: t.estimate, label: t.milestone };
              });

              const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
              // Gradient fill path (close to bottom)
              const areaD = `${pathD} L 100,40 L 0,40 Z`;
              const color = plan.mode === 'flight' ? '#0ea5e9' : plan.mode === 'train' ? '#6366f1' : '#f59e0b';
              const gradientId = `grad-${plan.mode}`;
              
              return (
                <g key={plan.mode}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area */}
                  <path d={areaD} fill={`url(#${gradientId})`} />
                  {/* Line */}
                  <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" className="opacity-90" />
                  {/* Points & Labels */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="1.5" fill={color} stroke="#fff" strokeWidth="0.5" />
                      {selectedMode !== 'all' && (
                        <text x={p.x} y={Math.max(4, p.y - 3)} fontSize="3.5" fill="#4B463F" textAnchor="middle" fontWeight="bold">
                          ₹{p.est.toLocaleString()}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Compare Strip */}
      {cheapest && fastest && cheapest.id !== fastest.id && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex-shrink-0 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wide">Cheapest</span>
            <span className="text-xs font-semibold text-sky-900">{cheapest.provider}</span>
          </div>
          <div className="flex-shrink-0 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg flex flex-col justify-center">
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Fastest</span>
            <span className="text-xs font-semibold text-amber-900">{fastest.provider}</span>
            <span className="text-[9px] text-amber-700">Saves {Math.floor(timeDeltaMins! / 60)}h {timeDeltaMins! % 60}m</span>
          </div>
        </div>
      )}

      {/* Disclaimer if not live */}
      {options.some(o => (o as any).isEstimate) && (
        <div className="mb-3 px-2 py-1 bg-cream-100 rounded text-[10px] text-ink-500 font-medium flex items-center gap-1.5">
          <Info size={12} />
          <span>Fares are estimates and may change.</span>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-3 relative">
        {filteredOptions.length === 0 && (
          <div className="text-center py-6 text-sm text-ink-500 bg-cream-50 rounded-card">
            No {selectedMode !== 'all' ? selectedMode : ''} options found.
          </div>
        )}
        
        {sortedOptions.map(opt => {
          const plan = plans?.find(p => p.mode === opt.mode);
          const isCheapestMode = cheapest.id === opt.id;
          // Calculate horizontal bar width relative to most expensive
          const maxPrice = Math.max(...options.map(o => o.price));
          const pricePct = Math.max(10, (opt.price / maxPrice) * 100);

          return (
            <Card key={opt.id} className="relative overflow-hidden group">
              {isCheapestMode && (
                <div className="absolute top-0 right-0 bg-sky-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                  Cheapest
                </div>
              )}
              <div className="p-3">
                {/* Header: Mode + Provider + Badges */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{modeIcons[opt.mode]}</span>
                    <span className="text-xs font-medium text-ink-600">{opt.provider}</span>
                  </div>
                  <div className="flex gap-1">
                    {(opt as any).isEstimate && (
                      <span className="text-[9px] bg-cream-100 text-ink-500 px-1.5 py-0.5 rounded font-bold">EST</span>
                    )}
                    {plan && (
                      <span className="text-[9px] bg-cream-100 text-ink-600 px-1.5 py-0.5 rounded font-bold">
                        {getTrendIcon(plan.trendDirection)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Times & Route */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-display font-bold text-lg text-ink-900">{opt.departureTime}</div>
                    <div className="text-[10px] text-ink-500 uppercase tracking-wide">{opt.departureCity}</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center relative px-2">
                    <div className="text-[10px] text-ink-400 font-medium mb-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {Math.floor(opt.durationMinutes / 60)}h {opt.durationMinutes % 60}m
                    </div>
                    <div className="w-full h-[1px] bg-cream-300 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cream-400"></div>
                    </div>
                    <div className="text-[9px] text-ink-400 mt-0.5">{opt.stops === 0 ? "Direct" : `${opt.stops} stop${opt.stops > 1 ? 's' : ''}`}</div>
                  </div>
                  <div className="flex-1 text-right relative">
                    <div className="font-display font-bold text-lg text-ink-900">
                      {opt.arrivalTime}
                    </div>
                    <div className="text-[10px] text-ink-500 uppercase tracking-wide">{opt.arrivalCity}</div>
                  </div>
                </div>

                {/* Price Bar & Select */}
                <div className="flex items-end justify-between mt-2 pt-2 border-t border-cream-100">
                  <div className="flex-1 pr-4">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-bold text-lg text-ink-900">₹{opt.price.toLocaleString()}</span>
                      <span className="text-[9px] text-ink-500">per person</span>
                    </div>
                    <div className="w-full h-1.5 bg-cream-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isCheapestMode ? 'bg-sky-500' : 'bg-cream-400'}`}
                        style={{ width: `${pricePct}%` }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSelectOption(opt)}
                    disabled={selectingId === opt.id}
                    className="shrink-0 bg-ink-900 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-ink-800 transition-colors disabled:opacity-50"
                  >
                    {selectingId === opt.id ? "..." : "Select"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
