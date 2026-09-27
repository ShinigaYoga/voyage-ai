"use client";

import React, { useState } from "react";
import { Message, TextMessage, TripMessage, BudgetBreakdown } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { Calendar, Users, X, Compass } from "lucide-react";
import Link from "next/link";

import { File as FileIcon } from "lucide-react";

import ReactMarkdown from 'react-markdown';

function TextMessageRenderer({ message }: { message: TextMessage }) {
  return (
    <div className="leading-relaxed flex flex-col gap-2 max-w-none">
      <ReactMarkdown
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
        {message.content}
      </ReactMarkdown>
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 not-prose">
          {message.attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/50 dark:bg-cream-200/50 border border-cream-200 rounded-lg p-1.5 shadow-sm max-w-[200px]">
              <div className="w-10 h-10 rounded bg-cream-50 dark:bg-cream-200 flex items-center justify-center shrink-0 overflow-hidden">
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
    <div className="bg-cream-50 dark:bg-cream-200 rounded-card shadow-soft p-4 text-ink-900 border border-cream-200 mt-1 max-w-xs">
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
    <Card className="p-4 border border-sage-200 dark:border-sage-300/30 bg-sage-50 dark:bg-sage-100/20 shadow-sm mt-1 max-w-xs">
      <div className="flex items-center gap-2 text-sage-700 dark:text-sage-300 font-bold mb-3">
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
            className="w-full bg-white dark:bg-cream-200 border-sage-200 hover:bg-sage-100 text-sage-800"
          >
            View Changes in Dashboard
          </Button>
        </Link>
      )}
    </Card>
  );
}

function ItineraryRenderer({ message }: { message: any }) {
  const itinerary = message.itinerary;
  const daysCount = itinerary?.days?.length || 0;

  return (
    <Card className="p-4 border border-cream-200 bg-cream-50 dark:bg-cream-200 shadow-sm overflow-hidden mt-1 max-w-xs">
      <div className="bg-cream-100 dark:bg-cream-200 -mx-4 -mt-4 px-4 py-3 mb-4 border-b border-cream-200">
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
  const rawOptions = message.options || message.transportOptions || [];
  const tripId = message.tripId;
  const [sortKey, setSortKey] = useState<'score' | 'price' | 'duration' | 'departure'>('score');
  const [filterMode, setFilterMode] = useState<'all' | 'flight' | 'train' | 'bus'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (tripId) {
      import('@/lib/repositories/indexeddb/IndexedDbTripRepository').then(({ IndexedDbTripRepository }) => {
        const repo = new IndexedDbTripRepository();
        repo.get(tripId).then(trip => {
          if (trip?.transport?.id) {
            setSelectedId(trip.transport.id);
          }
        }).catch(console.error);
      });
    }
  }, [tripId]);

  if (rawOptions.length === 0) {
    return <div className="text-xs text-ink-500 italic p-2">No transport options found.</div>;
  }

  let filtered = rawOptions.filter((o: any) => filterMode === 'all' || o.mode === filterMode);
  let sorted = [...filtered].sort((a: any, b: any) => {
    if (sortKey === 'price') return a.price - b.price;
    if (sortKey === 'duration') return a.durationMinutes - b.durationMinutes;
    if (sortKey === 'departure') return (a.departureTime || '').localeCompare(b.departureTime || '');
    return (b.score || 0) - (a.score || 0);
  });

  // Compute comparison stats
  const byPrice = [...rawOptions].sort((a: any, b: any) => a.price - b.price);
  const byDuration = [...rawOptions].sort((a: any, b: any) => a.durationMinutes - b.durationMinutes);
  const cheapest = byPrice[0];
  const fastest = byDuration[0];
  const priceDelta = cheapest && fastest && cheapest.id !== fastest.id
    ? Math.abs(fastest.price - cheapest.price)
    : null;
  const timeDeltaMins = cheapest && fastest && cheapest.id !== fastest.id
    ? Math.abs(fastest.durationMinutes - cheapest.durationMinutes)
    : null;
  const timeDeltaStr = timeDeltaMins != null
    ? `${Math.floor(timeDeltaMins / 60)}h ${timeDeltaMins % 60}m`
    : null;

  const handleSelectOption = async (option: any) => {
    if (!tripId || selectingId) return;
    setSelectingId(option.id);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          message: `Select transport option ${option.id} (${option.provider} ${option.mode} ₹${option.price})`,
        }),
      });
      if (res.ok) {
        setSelectedId(option.id);
        const data = await res.json();
        if (data.trip) {
          const { IndexedDbTripRepository } = await import('@/lib/repositories/indexeddb/IndexedDbTripRepository');
          const localRepo = new IndexedDbTripRepository();
          await localRepo.upsert(data.trip);
          fetch('/api/trips/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip: data.trip }),
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Failed to select transport', e);
    } finally {
      setSelectingId(null);
    }
  };

  const modeIcons: Record<string, string> = {
    flight: '✈️',
    train: '🚆',
    bus: '🚌',
  };

  const recommendationColors: Record<string, string> = {
    'Best value': 'bg-sage-100 text-sage-800 dark:bg-sage-200/30 dark:text-sage-300',
    'Cheapest': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    'Fastest': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className="mt-2 w-full max-w-sm">
      {/* Comparison Summary */}
      {priceDelta != null && timeDeltaStr && cheapest && fastest && (
        <div className="mb-4 p-3 rounded-card bg-cream-100 dark:bg-cream-200 border border-cream-200 text-xs">
          <div className="font-bold text-ink-900 mb-2 text-sm">Compare options</div>
          <div className="grid grid-cols-3 gap-1 text-center mb-2">
            <div className="text-ink-400 font-medium"></div>
            <div className="text-ink-500 font-semibold truncate">{fastest.provider}</div>
            <div className="text-ink-500 font-semibold truncate">{cheapest.provider}</div>

            <div className="text-ink-500 text-left">Price</div>
            <div className="text-ink-900 font-bold">₹{fastest.price.toLocaleString('en-IN')}</div>
            <div className="text-ink-900 font-bold">₹{cheapest.price.toLocaleString('en-IN')}</div>

            <div className="text-ink-500 text-left">Duration</div>
            <div className="text-ink-900">{Math.floor(fastest.durationMinutes / 60)}h {fastest.durationMinutes % 60}m</div>
            <div className="text-ink-900">{Math.floor(cheapest.durationMinutes / 60)}h {cheapest.durationMinutes % 60}m</div>

            <div className="text-ink-500 text-left">Stops</div>
            <div className="text-ink-900">{fastest.stops === 0 ? 'Direct' : `${fastest.stops}`}</div>
            <div className="text-ink-900">{cheapest.stops === 0 ? 'Direct' : `${cheapest.stops}`}</div>
          </div>
          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-cream-200">
            <span className="text-sage-700 dark:text-sage-400 font-medium">
              💡 {cheapest.provider} saves ₹{priceDelta.toLocaleString('en-IN')}
            </span>
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              ⚡ {fastest.provider} saves {timeDeltaStr}
            </span>
          </div>
        </div>
      )}

      {/* Filter + Sort controls */}
      <div className="flex gap-2 mb-3">
        <select
          value={sortKey}
          onChange={(e: any) => setSortKey(e.target.value)}
          className="text-xs bg-cream-100 dark:bg-cream-200 border border-cream-200 rounded-lg px-2 py-1.5 outline-none text-ink-700 flex-1"
        >
          <option value="score">Sort: Recommended</option>
          <option value="price">Sort: Price</option>
          <option value="duration">Sort: Duration</option>
          <option value="departure">Sort: Departure</option>
        </select>

        <select
          value={filterMode}
          onChange={(e: any) => setFilterMode(e.target.value)}
          className="text-xs bg-cream-100 dark:bg-cream-200 border border-cream-200 rounded-lg px-2 py-1.5 outline-none text-ink-700 flex-1"
        >
          <option value="all">All modes</option>
          <option value="flight">Flights</option>
          <option value="train">Trains</option>
          <option value="bus">Buses</option>
        </select>
      </div>

      {/* Transport option cards */}
      <div className="space-y-3">
        {sorted.map((opt: any) => {
          const isSelected = selectedId === opt.id;
          const isSelecting = selectingId === opt.id;
          const hours = Math.floor(opt.durationMinutes / 60);
          const mins = opt.durationMinutes % 60;
          const durationStr = `${hours}h ${mins}m`;
          const icon = modeIcons[opt.mode] || '🚗';
          const recColor = opt.recommendationReason
            ? (recommendationColors[opt.recommendationReason] || 'bg-sage-100 text-sage-800 dark:bg-sage-200/30 dark:text-sage-300')
            : '';

          return (
            <div
              key={opt.id}
              className={`rounded-card border transition-all overflow-hidden ${
                isSelected
                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-100/20 shadow-soft'
                  : 'border-cream-200 bg-cream-50 dark:bg-cream-200/60 hover:border-sage-300 hover:shadow-sm'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="font-bold text-sm text-ink-900">{opt.provider}</div>
                    <div className="text-xs text-ink-500 capitalize">{opt.mode}</div>
                  </div>
                </div>
                {opt.recommendationReason && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-pill ${recColor}`}>
                    {opt.recommendationReason === 'Best value' ? '⭐ Best Value' :
                     opt.recommendationReason === 'Cheapest' ? '💰 Cheapest' :
                     opt.recommendationReason === 'Fastest' ? '⚡ Fastest' :
                     opt.recommendationReason}
                  </span>
                )}
              </div>

              {/* Time row */}
              <div className="px-4 pb-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-900 text-base">{opt.departureTime}</span>
                    <span className="text-ink-400">→</span>
                    <span className="font-bold text-ink-900 text-base">{opt.arrivalTime}</span>
                  </div>
                  <div className="text-xs text-ink-500 text-right">
                    <div>{durationStr}</div>
                    <div>{opt.stops === 0 ? 'Direct' : `${opt.stops} stop${opt.stops > 1 ? 's' : ''}`}</div>
                  </div>
                </div>
              </div>

              {/* Price + Action */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-cream-200/60 bg-white/40 dark:bg-cream-100/10">
                <div>
                  <div className="font-display font-bold text-lg text-sage-800 dark:text-sage-300">
                    ₹{opt.price.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-ink-400">per person</div>
                </div>
                <Button
                  size="sm"
                  variant={isSelected ? 'accent' : 'outline'}
                  onClick={() => handleSelectOption(opt)}
                  className={isSelected ? 'bg-sage-600 text-white' : ''}
                >
                  {isSelecting ? '...' : isSelected ? '✓ Selected' : 'Select'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-3 text-[10px] text-ink-400">
        {sorted.length} option{sorted.length !== 1 ? 's' : ''} available
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
      <div className="relative z-10 w-full sm:max-w-md bg-cream-50 dark:bg-cream-100 rounded-t-cardLg sm:rounded-cardLg shadow-float max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cream-50 dark:bg-cream-100 px-6 pt-6 pb-4 border-b border-cream-200">
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
  const hotels = message.hotels || [];
  if (hotels.length === 0) return <div className="text-xs text-ink-500 italic p-2">No hotels found.</div>;

  return (
    <div className="mt-2 w-full max-w-sm space-y-3">
      {hotels.slice(0, 3).map((hotel: any) => (
        <Card key={hotel.id} className="overflow-hidden border-cream-200 bg-white dark:bg-cream-200">
          {hotel.imageUrl && (
            <div className="h-32 w-full bg-cream-100 overflow-hidden relative">
              <img src={hotel.imageUrl} alt={hotel.name} className="w-full h-full object-cover" />
              {hotel.recommendationReason && (
                <div className="absolute top-2 left-2 bg-sage-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-medium">
                  {hotel.recommendationReason}
                </div>
              )}
            </div>
          )}
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
                <span key={i} className="text-[10px] bg-cream-100 dark:bg-cream-300 text-ink-600 px-1.5 py-0.5 rounded">
                  {am}
                </span>
              ))}
            </div>
            {message.tripId && (
              <Link href={`/booking/new?type=hotel&itemId=${hotel.id}&tripId=${message.tripId}`} className="block mt-2">
                <Button variant="outline" size="sm" className="w-full text-xs py-1 h-auto">Book Now</Button>
              </Link>
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
        <Card key={rest.id} className="overflow-hidden border-cream-200 bg-white dark:bg-cream-200">
          {rest.imageUrl && (
            <div className="h-24 w-full bg-cream-100 overflow-hidden">
              <img src={rest.imageUrl} alt={rest.name} className="w-full h-full object-cover" />
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
  const attractions = message.attractions || [];
  if (attractions.length === 0) return <div className="text-xs text-ink-500 italic p-2">No attractions found.</div>;

  return (
    <div className="mt-2 w-full max-w-sm space-y-3">
      {attractions.slice(0, 3).map((attr: any) => (
        <Card key={attr.id} className="overflow-hidden border-cream-200 bg-white dark:bg-cream-200 p-3 flex gap-3">
          {attr.imageUrl ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
              <img src={attr.imageUrl} alt={attr.name} className="w-full h-full object-cover" />
            </div>
          ) : (
             <div className="w-16 h-16 rounded-lg bg-cream-100 shrink-0 flex items-center justify-center text-2xl">
               📸
             </div>
          )}
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
      <Card className={`p-4 border ${isSuccess ? 'border-sage-300 bg-sage-50 dark:bg-sage-900/30' : 'border-coral-300 bg-coral-50 dark:bg-coral-900/30'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{isSuccess ? '✅' : '❌'}</span>
          <div className={`font-bold ${isSuccess ? 'text-sage-800 dark:text-sage-300' : 'text-coral-800 dark:text-coral-300'}`}>
            {isSuccess ? 'Booking Confirmed' : 'Booking Failed'}
          </div>
        </div>
        
        {isSuccess && booking.confirmationCode && (
          <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-center mb-3">
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

export function MessageRenderer({ message }: { message: Message }) {
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
      return <TransportRenderer message={message} />;
    case "hotel":
      return <HotelRenderer message={message} />;
    case "restaurant":
      return <RestaurantRenderer message={message} />;
    case "attraction":
      return <AttractionRenderer message={message} />;
    case "booking":
      return <BookingRenderer message={message} />;
    case "activity":
    case "food":
    case "weather":
      return (
        <div className="italic text-ink-500 text-xs py-1">
          [{message.type} card placeholder]
        </div>
      );
    default:
      return <div>Unsupported message type</div>;
  }
}

// Export ExpenditureModal separately for use in BudgetCard
export { ExpenditureModal };

