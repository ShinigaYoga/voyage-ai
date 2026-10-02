/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";


import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Message, TextMessage, TripMessage, BudgetBreakdown, WeatherMessage } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { Calendar, Users, X, Compass, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { File as FileIcon } from "lucide-react";
import { ImageWithFallback } from "../ui/ImageWithFallback";
import { isGeneratedImageUrl } from "@/lib/images/activityImage";
import { PlaceImage } from "../ui/PlaceImage";
import { usePlaceImages } from "@/lib/hooks/usePlaceImages";
import { createBookingDraft } from "@/lib/services/booking/bookingDraftStore";

import ReactMarkdown from 'react-markdown';
import { TransportResultsCard } from "./TransportResultsCard";
import { WeatherCard } from "@/components/trip/WeatherCard";

type MarkdownBlock =
  | { type: "text"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function tableCells(row: string): string[] {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function isTableSeparator(row: string): boolean {
  if (!row.includes("|")) return false;
  const cells = tableCells(row);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];
  let text: string[] = [];
  const flushText = () => {
    const value = text.join("\n").trim();
    if (value) blocks.push({ type: "text", content: value });
    text = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes("|") && lines[index + 1]?.includes("|") && isTableSeparator(lines[index + 1])) {
      flushText();
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", headers, rows });
    } else if (!isTableSeparator(line)) {
      text.push(line);
    }
  }
  flushText();
  return blocks;
}

function MarkdownTableCard({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-2 space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="rounded-xl border border-cream-200 bg-white p-3 shadow-soft">
          {row.map((value, cellIndex) => value && (
            <div key={cellIndex} className="flex flex-wrap gap-x-2 text-xs leading-relaxed">
              <strong className="text-ink-900">{headers[cellIndex] || `Item ${cellIndex + 1}`}:</strong>
              <span className="text-ink-700">{value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TextMessageRenderer({ message }: { message: TextMessage }) {
  const blocks = message.role === "assistant"
    ? parseMarkdownBlocks(message.content)
    : [{ type: "text" as const, content: message.content }];
  return (
    <div className="leading-relaxed flex flex-col gap-2 max-w-none">
      {blocks.map((block, index) => block.type === "table" ? (
        <MarkdownTableCard key={index} headers={block.headers} rows={block.rows} />
      ) : (
        <ReactMarkdown
          key={index}
          components={{
            h1: ({node, ...props}) => <h1 className="font-display font-bold text-xl my-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="font-display font-bold text-lg my-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="font-display font-bold text-base my-1" {...props} />,
            p: ({node, ...props}) => <p className="my-1" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-1 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-1 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="" {...props} />,
            a: ({node, ...props}) => <a className="text-sage-600 hover:underline" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
          }}
        >
          {block.content}
        </ReactMarkdown>
      ))}
          {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 not-prose">
          {message.attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/50  border border-cream-200 rounded-lg p-1.5 shadow-sm max-w-50 md:max-w-50">
              <div className="w-10 h-10 rounded bg-cream-50  flex items-center justify-center shrink-0 overflow-hidden">
                {att.type.startsWith('image/') ? (
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <FileIcon size={16} className="text-ink-400" />
                )}
              </div>
              <div className="text-xs text-ink-700 truncate font-medium flex-1 pr-2">
                {att.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TripMessageRenderer({ message }: { message: TripMessage }) {
  const { trip } = message;
  if (!trip) return <div>Trip Details</div>;

  return (
    <div className="bg-cream-50  rounded-card shadow-soft p-4 text-ink-900 border border-cream-200 mt-1 max-w-xs">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center text-xl shrink-0">
          🌍
        </div>
        <div>
          <h4 className="font-display font-bold text-sm text-ink-900">{trip.name}</h4>
          <p className="text-xs text-ink-500 font-medium">{trip.destination}</p>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-ink-600 mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={12} className="text-sage-600" />
          <span>{trip.dates || "Dates TBD"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={12} className="text-sage-600" />
          <span>{trip.travelers}</span>
        </div>
      </div>

      {trip.budget && (
        <div className="mb-3">
          <Badge variant="sage">{trip.budget}</Badge>
        </div>
      )}

      <Link href={`/trip/${trip.id}`} className="block">
        <button className="w-full text-xs font-semibold py-2 px-3 rounded-pill bg-sage-600 text-white hover:bg-sage-700 transition-colors">
          View Expedition &rarr;
        </button>
      </Link>
    </div>
  );
}

import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

function TripUpdatedRenderer({ message }: { message: any }) {
  const changes = message.changes || [];
  return (
    <Card className="p-4 border border-sage-200  bg-sage-50  shadow-sm mt-1 max-w-xs">
      <div className="flex items-center gap-2 text-sage-700  font-bold mb-3">
        <span className="text-xl">✓</span>
        <span>Trip Updated</span>
      </div>
      <ul className="space-y-2 mb-4">
        {changes.map((change: string, idx: number) => (
          <li key={idx} className="text-sm text-ink-700 flex items-start gap-2">
            <span className="text-sage-500 mt-0.5">•</span>
            <span>{change}</span>
          </li>
        ))}
      </ul>
      {message.trip && (
        <Link href={`/trip/${message.trip.id}`} className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white  border-sage-200 hover:bg-sage-100 text-sage-800"
          >
            View Changes in Dashboard
          </Button>
        </Link>
      )}
    </Card>
  );
}

function WeatherMessageRenderer({
  message,
  onReplan,
}: {
  message: WeatherMessage;
  onReplan?: () => void;
}) {
  const firstForecast = message.forecasts[0];
  const lastForecast = message.forecasts[message.forecasts.length - 1];
  const title = firstForecast
    ? `${message.dayNumber ? `Day ${message.dayNumber} — ` : ""}${new Date(`${firstForecast.date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}${lastForecast && lastForecast.date !== firstForecast.date
        ? ` – ${new Date(`${lastForecast.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : ""}`
    : undefined;

  return (
    <div className="w-full min-w-0">
      <WeatherCard
        forecasts={message.forecasts}
        compact
        title={message.dayNumber ? title : "Weather Forecast"}
        affectedDayNumbers={message.affectedDayNumbers}
        onReplan={onReplan}
      />
    </div>
  );
}

function ItineraryRenderer({ message }: { message: any }) {
  const itinerary = message.itinerary;
  const daysCount = itinerary?.days?.length || 0;

  return (
    <Card className="p-4 border border-cream-200 bg-cream-50  shadow-sm overflow-hidden mt-1 max-w-xs">
      <div className="bg-cream-100  -mx-4 -mt-4 px-4 py-3 mb-4 border-b border-cream-200">
        <h4 className="font-display font-bold text-ink-900">{daysCount}-Day Itinerary</h4>
        <p className="text-xs text-ink-500 font-medium">{message.tripName || 'Your Trip'}</p>
      </div>

      <div className="space-y-3 mb-4">
        {itinerary?.days?.slice(0, 3).map((day: any) => (
          <div key={day.dayIndex} className="flex gap-3 text-sm">
            <div className="font-bold text-ink-400 w-12 shrink-0">Day {day.dayIndex + 1}</div>
            <div className="text-ink-700 truncate font-medium">
              {day.activities?.length > 0
                ? day.activities.map((a: any) => a.name).join(' • ')
                : 'Free day'}
            </div>
          </div>
        ))}
        {daysCount > 3 && (
          <div className="text-center text-xs text-ink-400 font-medium pt-1">
            + {daysCount - 3} more days
          </div>
        )}
      </div>

      <Link href={`/trip/${message.tripId || message.trip?.id}/itinerary`} className="block">
        <Button className="w-full">
          Open Full Itinerary &rarr;
        </Button>
      </Link>
    </Card>
  );
}

// ─── Beautiful Transport Comparison UI ───────────────────────────────────────

function TransportRenderer({ message }: { message: any }) {
  const options = message.options || message.transportOptions || [];
  const plans = message.plans;
  const origin = message.origin || options[0]?.departureLocation || "Origin";
  const destination = message.destination || options[0]?.arrivalLocation || "Destination";
  const departureDate = message.departureDate;
  const tripId = message.tripId;

  return (
    <TransportResultsCard
      origin={origin}
      destination={destination}
      departureDate={departureDate}
      returnDate={message.returnDate}
      today={message.today}
      daysToGo={message.daysToGo}
      bookingAdvice={message.bookingAdvice}
      source={message.source}
      plans={plans}
      options={options}
      tripId={tripId}
    />
  );
}

// ─── Beautiful Transport Comparison Dates UI ──────────────────────────────

function TransportComparisonRenderer({ message }: { message: any }) {
  const comparisons = message.comparisons || [];
  const tripId = message.tripId;
  const router = useRouter();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  if (comparisons.length === 0) {
    return <div className="text-xs text-ink-500 italic p-2">No comparison data found.</div>;
  }

  const handleSelectOption = async (option: any, date: string) => {
    if (!tripId || selectingId) return;
    setSelectingId(`${option.id}_${date}`);
    try {
      const draft = createBookingDraft({
        type: "transport",
        item: option,
        details: {
          tripId,
          date,
          passengers: 1,
        },
      });
      router.push(`/booking/${draft.id}`);
    } catch (e) {
      console.error('Failed to navigate to booking wizard', e);
    } finally {
      setSelectingId(null);
    }
  };

  const modeIcons: Record<string, string> = {
    flight: '✈️',
    train: '🚆',
    bus: '🚌',
  };

  // Find overall cheapest to highlight
  let overallCheapestPrice = Infinity;
  comparisons.forEach((comp: any) => {
    comp.options.forEach((opt: any) => {
      if (opt.price < overallCheapestPrice) overallCheapestPrice = opt.price;
    });
  });

  return (
    <div className="w-full flex flex-col gap-4 font-sans max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-sage-100 text-sage-700 p-2 rounded-xl">
          <Calendar size={18} />
        </div>
        <div>
          <h4 className="font-display font-bold text-ink-900 leading-tight">Compare Future Travel Dates</h4>
          <p className="text-xs text-ink-500">Estimated prices for {message.origin} to {message.destination}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2 items-start text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <p><strong>Demo/Estimate Data:</strong> These prices are simulated for comparison purposes and do not represent live availability. Real prices may vary.</p>
      </div>

      <div className="flex flex-col gap-3">
        {comparisons.map((comp: any, idx: number) => {
          // Get best option for this date
          const bestOption = [...comp.options].sort((a: any, b: any) => a.price - b.price)[0];
          if (!bestOption) return null;
          
          const isOverallCheapest = bestOption.price === overallCheapestPrice;
          const isSelecting = selectingId === `${bestOption.id}_${comp.date}`;
          const durationStr = `${Math.floor(bestOption.durationMinutes / 60)}h ${bestOption.durationMinutes % 60}m`;
          
          const dateObj = new Date(comp.date);
          const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

          return (
            <div 
              key={`${comp.date}-${idx}`} 
              className={`flex flex-col md:flex-row items-stretch border rounded-xl overflow-hidden transition-all ${isOverallCheapest ? 'border-sage-300 shadow-md ring-1 ring-sage-200' : 'border-cream-200 bg-white  hover:border-cream-300'}`}
            >
              {/* Date Column */}
              <div className={`p-4 flex flex-col justify-center items-start md:items-center min-w-30 ${isOverallCheapest ? 'bg-sage-50 text-sage-900' : 'bg-cream-50 text-ink-700'}`}>
                <span className="text-sm font-bold block">{dateStr}</span>
                {isOverallCheapest && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-600 mt-1 bg-sage-200/50 px-2 py-0.5 rounded-full">
                    Cheapest
                  </span>
                )}
              </div>
              
              {/* Details Column */}
              <div className="p-4 flex-1 flex flex-col justify-center gap-1 border-t md:border-t-0 md:border-l border-cream-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{modeIcons[bestOption.mode] || '🎟️'}</span>
                  <span className="font-bold text-sm text-ink-900">{bestOption.provider || bestOption.mode}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-600 mt-1">
                  <span className="font-semibold">{bestOption.departureTime}</span>
                  <span className="text-ink-300">→</span>
                  <span className="font-semibold">{bestOption.arrivalTime}</span>
                  <span className="text-ink-300 ml-1">·</span>
                  <span className="ml-1">{durationStr}</span>
                </div>
              </div>
              
              {/* Price & Action Column */}
              <div className="p-4 flex flex-row md:flex-col items-center justify-between md:justify-center gap-2 bg-cream-50/50 border-t md:border-t-0 md:border-l border-cream-100 min-w-35">
                <div className="text-right flex md:flex-col items-center md:items-end gap-2 md:gap-0">
                  <div className={`font-display font-bold text-lg ${isOverallCheapest ? 'text-sage-700' : 'text-ink-900'}`}>
                    ₹{bestOption.price.toLocaleString('en-IN')}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isOverallCheapest ? 'primary' : 'outline'}
                  onClick={() => handleSelectOption(bestOption, comp.date)}
                  className="w-full max-w-25"
                >
                  {isSelecting ? '...' : 'Select'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expenditure Modal ────────────────────────────────────────────────────────

function ExpenditureModal({
  breakdown,
  tripName,
  onClose,
}: {
  breakdown: BudgetBreakdown;
  tripName?: string;
  onClose: () => void;
}) {
  const categories = [
    { key: 'transport', label: 'Transport', icon: '✈️', color: 'bg-sky-400' },
    { key: 'hotel', label: 'Accommodation', icon: '🏨', color: 'bg-indigo-400' },
    { key: 'food', label: 'Food & Dining', icon: '🍽️', color: 'bg-coral-400' },
    { key: 'activities', label: 'Activities', icon: '🎯', color: 'bg-sage-400' },
    { key: 'localTransport', label: 'Local Travel', icon: '🛺', color: 'bg-amber-400' },
    { key: 'other', label: 'Other', icon: '📦', color: 'bg-ink-300' },
  ] as const;

  const isOver = breakdown.status === 'over';
  const isNear = breakdown.status === 'near';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-cream-50  rounded-t-cardLg sm:rounded-cardLg shadow-float max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cream-50  px-6 pt-6 pb-4 border-b border-cream-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-xl text-ink-900">Expenditure</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          {tripName && <p className="text-xs text-ink-500">{tripName}</p>}

          {/* Summary row */}
          <div className="flex gap-4 mt-4">
            <div>
              <div className="text-xs text-ink-500 mb-0.5">Total Spent</div>
              <div className="font-display font-bold text-lg text-ink-900">
                ₹{breakdown.total.toLocaleString('en-IN')}
              </div>
            </div>
            {breakdown.budget > 0 && (
              <>
                <div>
                  <div className="text-xs text-ink-500 mb-0.5">Budget</div>
                  <div className="font-display font-bold text-lg text-ink-900">
                    ₹{breakdown.budget.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-500 mb-0.5">
                    {isOver ? 'Over budget' : 'Remaining'}
                  </div>
                  <div className={`font-display font-bold text-lg ${isOver ? 'text-coral-600' : isNear ? 'text-amber-600' : 'text-sage-700'}`}>
                    {isOver ? '-' : ''}₹{Math.abs(breakdown.remaining).toLocaleString('en-IN')}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category list */}
        <div className="px-6 py-4 space-y-3">
          <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
            Breakdown by Category
          </h3>
          {categories.map(({ key, label, icon, color }) => {
            const amount = breakdown[key as keyof BudgetBreakdown] as number;
            if (!amount || amount === 0) return null;
            const pct = breakdown.total > 0 ? Math.round((amount / breakdown.total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium text-ink-700">{label}</span>
                    <span className="text-sm font-bold text-ink-900">
                      ₹{amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} opacity-70 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-400 mt-0.5">{pct}% of total</div>
                </div>
              </div>
            );
          })}

          {breakdown.total === 0 && (
            <div className="text-center py-8 text-ink-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">No expenses tracked yet.</p>
              <p className="text-xs mt-1">Add activities and transport to see your breakdown.</p>
            </div>
          )}
        </div>

        {/* Total bar */}
        {breakdown.budget > 0 && (
          <div className="px-6 pb-6">
            <div className="h-3 bg-cream-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isOver ? 'bg-coral-500' : isNear ? 'bg-amber-500' : 'bg-sage-500'
                }`}
                style={{ width: `${Math.min((breakdown.total / breakdown.budget) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-ink-400 mt-1 text-right">
              {Math.round((breakdown.total / breakdown.budget) * 100)}% of budget used
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hotel Renderer ────────────────────────────────────────────────────────────
function HotelRenderer({ message }: { message: any }) {
  const router = useRouter();
  const rawHotels = message.hotels || [];
  const destination = message.destination || "";
  const enrichedHotels = usePlaceImages(rawHotels, "hotel", destination);
  const hotels = enrichedHotels;
  if (hotels.length === 0) return <div className="text-xs text-ink-500 italic p-2">No hotels found.</div>;

  return (
    <div className="mt-2 w-full max-w-sm space-y-3">
      {hotels.slice(0, 3).map((hotel: any) => (
        <Card key={hotel.id} className="overflow-hidden border-cream-200 bg-white ">
          <div className="h-36 w-full overflow-hidden relative">
            <PlaceImage
              src={hotel.imageSource ? hotel.imageUrl : undefined}
              alt={hotel.imageAlt || hotel.name}
              source={hotel.imageSource}
              attribution={hotel.attribution}
              type="hotel"
              className="h-36 w-full rounded-t-card"
              key={`${hotel.id}-${hotel.imageUrl || "pending"}`}
            />
            {hotel.recommendationReason && (
              <div className="absolute top-2 left-2 bg-sage-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-medium">
                {hotel.recommendationReason}
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex justify-between items-start mb-1">
              <div className="font-bold text-ink-900 text-sm">{hotel.name}</div>
              <div className="text-sage-700 font-bold text-sm">₹{hotel.pricePerNight}</div>
            </div>
            <div className="flex gap-2 text-[10px] text-ink-500 mb-2">
              <span>📍 {hotel.location}</span>
              <span>⭐ {hotel.rating}/5</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {hotel.amenities?.slice(0, 3).map((am: string, i: number) => (
                <span key={i} className="text-[10px] bg-cream-100  text-ink-600 px-1.5 py-0.5 rounded">
                  {am}
                </span>
              ))}
            </div>
            {message.tripId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs py-1 h-auto mt-2"
                onClick={() => {
                  const draft = createBookingDraft({
                    type: "hotel",
                    item: hotel,
                    details: { tripId: message.tripId },
                  });
                  router.push(`/booking/${draft.id}`);
                }}
              >
                Book Now
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Restaurant Renderer ───────────────────────────────────────────────────────
function RestaurantRenderer({ message }: { message: any }) {
  const restaurants = message.restaurants || [];
  if (restaurants.length === 0) return <div className="text-xs text-ink-500 italic p-2">No restaurants found.</div>;

  return (
    <div className="mt-2 w-full max-w-sm space-y-3">
      {restaurants.slice(0, 3).map((rest: any) => (
        <Card key={rest.id} className="overflow-hidden border-cream-200 bg-white ">
          {rest.imageUrl && (
            <div className="h-24 w-full bg-cream-100 overflow-hidden">
              <ImageWithFallback src={rest.imageUrl} alt={rest.name} className="w-full h-full object-cover" illustrative={isGeneratedImageUrl(rest.imageUrl)} />
            </div>
          )}
          <div className="p-3">
            <div className="flex justify-between items-start mb-1">
              <div className="font-bold text-ink-900 text-sm">{rest.name}</div>
              <div className="text-coral-600 font-bold text-sm">{rest.priceRange}</div>
            </div>
            <div className="flex gap-2 text-[10px] text-ink-500 mb-2">
              <span>📍 {rest.location}</span>
              <span>⭐ {rest.rating}/5</span>
            </div>
            <div className="text-[10px] text-ink-600 italic mb-3">
              Try: {rest.signatureDishes?.join(", ")}
            </div>
            {message.tripId && (
              <Link href={`/booking/new?type=restaurant&itemId=${rest.id}&tripId=${message.tripId}`} className="block mt-2">
                <Button variant="outline" size="sm" className="w-full text-xs py-1 h-auto">Book Table</Button>
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Attraction Renderer ───────────────────────────────────────────────────────
function AttractionRenderer({ message }: { message: any }) {
  const rawAttractions = message.attractions || [];
  const destination = message.destination || "";
  const enrichedAttractions = usePlaceImages(rawAttractions, "attraction", destination);
  const attractions = enrichedAttractions;
  if (attractions.length === 0) return <div className="text-xs text-ink-500 italic p-2">No attractions found.</div>;

  return (
    <div className="mt-2 w-full max-w-sm space-y-3">
      {attractions.slice(0, 3).map((attr: any) => (
        <Card key={attr.id} className="overflow-hidden border-cream-200 bg-white  p-3 flex gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
            <PlaceImage
              src={isGeneratedImageUrl(attr.imageUrl || '') ? undefined : attr.imageUrl}
              alt={attr.imageAlt || attr.name}
              source={attr.imageSource}
              attribution={attr.attribution}
              type="attraction"
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div>
            <div className="font-bold text-ink-900 text-sm mb-0.5">{attr.name}</div>
            <div className="flex gap-2 text-[10px] text-ink-500 mb-1">
              <span className="capitalize">{attr.category}</span>
              <span>⭐ {attr.rating}/5</span>
            </div>
            <div className="text-xs text-ink-700 line-clamp-2">
              {attr.description}
            </div>
            {message.tripId && (
              <Link href={`/guide?destination=${encodeURIComponent(attr.location || "Destination")}&attraction=${encodeURIComponent(attr.name)}&tripId=${message.tripId}`} className="block mt-2">
                <Button variant="outline" size="sm" className="w-full text-xs py-1 h-auto flex items-center justify-center gap-1">
                  <Compass size={12} /> Ask the Guide
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}


// ─── Booking Renderer ────────────────────────────────────────────────────────────
function BookingRenderer({ message }: { message: any }) {
  const booking = message.booking;
  if (!booking) return null;

  const isSuccess = booking.status === 'confirmed';

  return (
    <div className="mt-2 w-full max-w-xs">
      <Card className={`p-4 border ${isSuccess ? 'border-sage-300 bg-sage-50 ' : 'border-coral-300 bg-coral-50 '}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{isSuccess ? '✅' : '❌'}</span>
          <div className={`font-bold ${isSuccess ? 'text-sage-800 ' : 'text-coral-800 '}`}>
            {isSuccess ? 'Booking Confirmed' : 'Booking Failed'}
          </div>
        </div>
        
        {isSuccess && booking.confirmationCode && (
          <div className="bg-white/50  p-2 rounded text-center mb-3">
            <div className="text-[10px] text-ink-500 uppercase font-bold tracking-wider mb-1">Confirmation Code</div>
            <div className="font-display font-bold text-lg text-ink-900 tracking-widest">{booking.confirmationCode}</div>
          </div>
        )}
        
        <p className="text-xs text-ink-700 leading-relaxed font-medium mb-3">
          {booking.message}
        </p>

        {booking.tripId && (
          <Link href={`/trip/${booking.tripId}?tab=bookings`} className="block">
            <Button variant="outline" size="sm" className="w-full">
              View booking
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}

export function MessageRenderer({
  message,
  onReplan,
}: {
  message: Message;
  onReplan?: () => void;
}) {
  switch (message.type) {
    case "text":
      return <TextMessageRenderer message={message as TextMessage} />;
    case "trip":
      return <TripMessageRenderer message={message as TripMessage} />;
    case "tripUpdated":
      return <TripUpdatedRenderer message={message} />;
    case "itinerary":
      return <ItineraryRenderer message={message} />;
    case "transport":
    case "unified_transport":
    case "transport_planning":
      return <TransportRenderer message={message} />;
    case "hotel":
      return <HotelRenderer message={message} />;
    case "restaurant":
      return <RestaurantRenderer message={message} />;
    case "attraction":
      return <AttractionRenderer message={message} />;
    case "booking":
      return <BookingRenderer message={message} />;
    case "weather":
      return <WeatherMessageRenderer message={message as WeatherMessage} onReplan={onReplan} />;
    case "activity":
    case "food":
      return (
        <div className="italic text-ink-500 text-xs py-1">
          [{message.type} card placeholder]
        </div>
      );
    case "transport_comparison":
      return <TransportComparisonRenderer message={message} />;
    default:
      return <div>Unsupported message type</div>;
  }
}

// Export ExpenditureModal separately for use in BudgetCard
export { ExpenditureModal };
