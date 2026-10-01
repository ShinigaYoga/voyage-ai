"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TransportOption } from "@/lib/services/transport/types";
import { TransportPlan } from "@/lib/services/transport/planningTypes";
import { TransportBookingAdvice } from "@/lib/services/transport/transportAdvice";
import { createBookingDraft } from "@/lib/services/booking/bookingDraftStore";

interface TransportResultsCardProps {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  today?: string;
  daysToGo?: number;
  bookingAdvice?: TransportBookingAdvice;
  source?: "estimate" | "live";
  plans?: TransportPlan[];
  options: TransportOption[];
  tripId?: string;
}

const modes = ["all", "flight", "train", "bus"] as const;
type ModeFilter = typeof modes[number];
const modeTitles = { flight: "Flight", train: "Train", bus: "Bus" };
const modeIcons = { flight: "✈️", train: "🚆", bus: "🚌" };

function showDate(value?: string): string {
  if (!value) return "—";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function minutes(value: number): string {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export function TransportResultsCard(props: TransportResultsCardProps) {
  const {
    origin, destination, departureDate, returnDate, today, daysToGo,
    bookingAdvice, source, plans = [], options, tripId,
  } = props;
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<ModeFilter>("all");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const filteredOptions = selectedMode === "all"
    ? options
    : options.filter(option => option.mode === selectedMode);
  const sortedOptions = [...filteredOptions].sort((a, b) => a.price - b.price);
  const cheapest = options.length ? [...options].sort((a, b) => a.price - b.price)[0] : undefined;
  const fastest = options.length ? [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0] : undefined;
  const referenceToday = today || new Date().toISOString().slice(0, 10);
  const timelineStart = bookingAdvice?.windowStart || referenceToday;
  const timelineEnd = bookingAdvice?.windowEnd || departureDate || referenceToday;
  const startTime = new Date(`${timelineStart}T00:00:00Z`).getTime();
  const endTime = new Date(`${timelineEnd}T00:00:00Z`).getTime();
  const todayTime = new Date(`${referenceToday}T00:00:00Z`).getTime();
  const todayPosition = endTime > startTime
    ? Math.max(0, Math.min(100, ((todayTime - startTime) / (endTime - startTime)) * 100))
    : 0;
  const trendValues = plans.flatMap(plan => plan.trend.map(point => point.estimate));
  const maxTrend = Math.max(1, ...trendValues);
  const minTrend = Math.min(...trendValues);
  const trendRange = maxTrend - minTrend || 1;

  const handleSelect = (option: TransportOption) => {
    if (!tripId || selectingId) return;
    setSelectingId(option.id);
    const draft = createBookingDraft({
      type: "transport",
      item: option,
      details: {
        tripId,
        date: departureDate,
        passengers: 1,
      },
    });
    router.push(`/booking/${draft.id}`);
  };

  return (
    <div className="mt-2 w-full max-w-lg space-y-3">
      <Card className="space-y-2 border border-cream-200 bg-cream-50 p-4">
        <h3 className="font-display text-lg font-bold text-ink-900">{origin} → {destination}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {departureDate && <span className="rounded-full bg-white px-3 py-1 text-ink-700">Depart · {showDate(departureDate)}</span>}
          {returnDate && <span className="rounded-full bg-white px-3 py-1 text-ink-700">Return · {showDate(returnDate)}</span>}
          {typeof daysToGo === "number" && (
            <span className="rounded-full bg-sage-100 px-3 py-1 font-bold text-sage-700">
              {daysToGo < 0 ? "Departure passed" : daysToGo === 0 ? "Today" : `${daysToGo} days to go`}
            </span>
          )}
        </div>
      </Card>

      {bookingAdvice && departureDate && (
        <>
          <Card className="border border-sage-200 bg-sage-50 p-4">
            <h4 className="text-sm font-bold text-sage-800">
              {bookingAdvice.bookNow ? "Book now / limited time" : "Booking window"}
            </h4>
            <p className="mt-1 text-sm text-sage-700">
              {bookingAdvice.bookNow
                ? "Departure is close or has passed; check current availability."
                : `${showDate(bookingAdvice.windowStart)} – ${showDate(bookingAdvice.windowEnd)}`}
            </p>
          </Card>
          <Card className="border border-cream-200 bg-white p-4">
            <div className="mb-3 flex justify-between text-[10px] text-ink-500">
              <span>{showDate(timelineStart)}</span><span>Booking timeline</span><span>{showDate(timelineEnd)}</span>
            </div>
            <div className="relative h-2 rounded-full bg-cream-200">
              <div className="absolute inset-y-0 left-0 rounded-full bg-sage-400" style={{ width: `${todayPosition}%` }} />
              <div className="absolute -top-1.5 h-5 w-0.5 bg-ink-900" style={{ left: `${todayPosition}%` }} aria-label="Today marker" />
            </div>
            <div className="mt-2 text-center text-[10px] font-bold text-ink-700">Today · {showDate(referenceToday)}</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {bookingAdvice.milestones.filter(date => date >= referenceToday).map(date => (
                <span key={date} className="rounded-full bg-cream-100 px-2 py-0.5 text-[9px] text-ink-600">{showDate(date)}</span>
              ))}
            </div>
          </Card>
        </>
      )}

      {plans.length > 0 && typeof daysToGo === "number" && daysToGo >= 7 && (
        <Card className="border border-cream-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-ink-600">
            <span>Estimated price trend</span><span>Est.</span>
          </div>
          <svg viewBox="0 0 100 40" className="h-24 w-full" role="img" aria-label="Estimated transport price trend">
            <line x1="0" y1="36" x2="100" y2="36" stroke="#E5E0D8" strokeWidth="0.7" />
            {plans.map(plan => {
              const points = plan.trend
                .filter(point => point.date >= referenceToday)
                .map((point, index, visible) => {
                  const x = visible.length > 1 ? index * 100 / (visible.length - 1) : 50;
                  const y = 32 - ((point.estimate - minTrend) / trendRange) * 26;
                  return `${x},${y}`;
                });
              if (points.length < 2) return null;
              const color = plan.mode === "flight" ? "#0ea5e9" : plan.mode === "train" ? "#6366f1" : "#f59e0b";
              return <polyline key={plan.mode} points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />;
            })}
          </svg>
          <div className="flex justify-between text-[9px] text-ink-500">
            <span>{showDate(referenceToday)}</span><span>{showDate(departureDate)}</span>
          </div>
        </Card>
      )}

      <div className="flex gap-1 rounded-lg bg-cream-100 p-1">
        {modes.map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setSelectedMode(mode)}
            className={`flex-1 rounded-md py-2 text-xs font-medium capitalize ${selectedMode === mode ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"}`}
          >
            {mode === "all" ? "All" : `${modeIcons[mode]} ${modeTitles[mode]}`}
          </button>
        ))}
      </div>

      {source !== "live" && (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-500">
          <Info size={12} /><span>Fares are estimates and may change.</span>
        </div>
      )}

      {cheapest && fastest && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-sky-50 p-2">
            <span className="block text-[9px] font-bold uppercase text-sky-700">Cheapest · ₹{cheapest.price.toLocaleString()}</span>
            <span className="text-xs text-sky-900">{modeTitles[cheapest.mode]}</span>
          </Card>
          <Card className="bg-amber-50 p-2">
            <span className="block text-[9px] font-bold uppercase text-amber-700">Fastest · {minutes(fastest.durationMinutes)}</span>
            <span className="block text-[9px] text-amber-900">{priceDeltaLabel(cheapest.price, fastest.price)}</span>
            <span className="block text-[9px] text-amber-900">{minutes(Math.abs(cheapest.durationMinutes - fastest.durationMinutes))} time difference</span>
          </Card>
        </div>
      )}

      {sortedOptions.length === 0 ? (
        <Card className="p-4 text-center text-sm text-ink-500">No transport estimates are available for this route.</Card>
      ) : (
        <div className="space-y-2">
          {sortedOptions.map(option => {
            const isOvernight = option.arrivalTime < option.departureTime;
            const isCheapest = option.id === cheapest?.id;
            const isFastest = option.id === fastest?.id;
            return (
              <Card key={option.id} className="space-y-3 border border-cream-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-ink-900">{modeIcons[option.mode]} {modeTitles[option.mode]}</div>
                  {option.provider && <span className="text-xs text-ink-600">{option.provider}</span>}
                  <div className="flex gap-1">
                    {isCheapest && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">Cheapest</span>}
                    {isFastest && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">Fastest</span>}
                    {option.isEstimate && <span className="rounded bg-cream-100 px-1.5 py-0.5 text-[9px] font-bold text-ink-500">Est.</span>}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div><div className="font-display text-lg font-bold text-ink-900">{option.departureTime}</div><div className="text-[10px] text-ink-500">{option.departureCity}</div></div>
                  <div className="text-center"><Clock size={13} className="mx-auto text-ink-400" /><div className="text-[10px] text-ink-500">{minutes(option.durationMinutes)}</div></div>
                  <div className="text-right"><div className="font-display text-lg font-bold text-ink-900">{option.arrivalTime}</div><div className="text-[10px] text-ink-500">{option.arrivalCity}</div>{isOvernight && <span className="text-[9px] font-bold text-sky-700">+1 day</span>}</div>
                </div>
                <div className="flex items-center justify-between border-t border-cream-100 pt-2">
                  <div>
                    <div className="text-lg font-bold text-ink-900">₹{option.price.toLocaleString()} <span className="text-[10px] font-normal text-ink-500">per person</span></div>
                    {option.priceRange && <div className="text-[9px] text-ink-500">Est. range ₹{option.priceRange.min.toLocaleString()}–₹{option.priceRange.max.toLocaleString()}</div>}
                  </div>
                  <button type="button" disabled={!tripId || selectingId === option.id} onClick={() => handleSelect(option)} className="rounded-lg bg-ink-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {selectingId === option.id ? "..." : "Select"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function priceDeltaLabel(cheapest: number, fastest: number): string {
  const delta = Math.abs(fastest - cheapest);
  return `₹${delta.toLocaleString()} price difference`;
}
