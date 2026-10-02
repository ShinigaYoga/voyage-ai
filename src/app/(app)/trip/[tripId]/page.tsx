"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Trip, Activity, ChecklistItem } from "@/lib/types";
import { getDestinationProfile } from "@/lib/itinerary/destinations";
import { PageHeader } from "@/components/layout/PageHeader";
import { BudgetCard } from "@/components/trip/BudgetCard";
import { WeatherCard } from "@/components/trip/WeatherCard";
import { DayCard } from "@/components/trip/DayCard";
import { ActivityEditSheet } from "@/components/trip/ActivityEditSheet";
import { calculateBudgetBreakdown } from "@/lib/budget/engine";
import { TripMap } from "@/components/trip/TripMap";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Share2, MessageSquare, Compass, Plus, Trash2 } from "lucide-react";
import { useWeather } from "@/lib/hooks/useWeather";
import { useToast } from "@/lib/hooks/useToast";

import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { resolveOriginCoords } from "@/lib/itinerary/coordinateUtils";

function getTripChecklist(trip: Trip): ChecklistItem[] {
  if (trip.checklist) return trip.checklist;
  return (trip.notes || "")
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const marker = trimmed.match(/^(?:[-*]\s*)?(?:\[([ xX])\]|([☑✓]))\s*/);
      return {
        id: `legacy-${index}`,
        text: trimmed.replace(/^(?:[-*]\s*)?(?:\[[ xX]\]|[☐☑✓])\s*/, "").trim(),
        completed: marker ? Boolean(marker[1]?.trim() || marker[2]) : false,
      };
    })
    .filter((item): item is ChecklistItem => Boolean(item?.text));
}

function TripDashboard() {
  const { tripId } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const tabFromUrl = (searchParams.get('tab') as 'itinerary' | 'map' | 'bookings' | 'notes') || 'itinerary';
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'bookings' | 'notes'>(tabFromUrl);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [dismissedRainDays, setDismissedRainDays] = useState<number[]>([]);
  const [replanningDay, setReplanningDay] = useState<number | null>(null);

  // Real weather — resolves destination name to coordinates, calls Open-Meteo
  const { forecasts: weatherForecasts, loading: weatherLoading, error: weatherError } = useWeather(
    trip?.destination,
    7
  );

  useEffect(() => {
    const syncFromTripEvent = (event: Event) => {
      const custom = event as CustomEvent<{ trip?: Trip }>; 
      const incoming = custom.detail?.trip;
      if (!incoming || !tripId) return;
      const id = typeof tripId === "string" ? tripId : tripId[0];
      if (incoming.id !== id) return;
      setTrip(prev => ({ ...prev, ...incoming, budgetBreakdown: incoming.budgetBreakdown || calculateBudgetBreakdown(incoming) } as Trip));
      setChecklist(getTripChecklist(incoming));
    };

    const syncFromStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith("trip_updated_")) return;
      if (!tripId) return;
      const id = typeof tripId === "string" ? tripId : tripId[0];
      const keyId = event.key.replace("trip_updated_", "");
      if (keyId !== id) return;
      try {
        const payload = event.newValue ? JSON.parse(event.newValue) : null;
        if (!payload?.trip) return;
        setTrip(prev => ({ ...prev, ...payload.trip, budgetBreakdown: payload.trip.budgetBreakdown || calculateBudgetBreakdown(payload.trip) } as Trip));
        setChecklist(getTripChecklist(payload.trip));
      } catch {}
    };

    window.addEventListener("trip-updated", syncFromTripEvent);
    window.addEventListener("storage", syncFromStorage);

    if (!tripId) return;
    const id = typeof tripId === "string" ? tripId : tripId[0];

    console.log("[TripDetailPage] mount effect starting for tripId:", id);
    let cancelled = false;

    async function load() {
      // --- Step 1: Load from IndexedDB immediately (fast, always works) ---
      try {
        const localRepo = new IndexedDbTripRepository();
        const localTrip = await localRepo.get(id);
        if (localTrip && !cancelled) {
          // Ensure budgetBreakdown is computed
          const withBreakdown = {
            ...localTrip,
            budgetBreakdown: localTrip.budgetBreakdown || calculateBudgetBreakdown(localTrip),
          };
          setTrip(withBreakdown);
          setChecklist(getTripChecklist(localTrip));
          localStorage.setItem("lastOpenedTripId", localTrip.id);
          localStorage.setItem("lastOpenedTripName", localTrip.name);
          console.log("[TripDetailPage] mount effect done (loaded local)");
        }
      } catch (e) {
        console.warn("[TripDashboard] IndexedDB load failed", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      // --- Step 2: Background sync from server (non-blocking) ---
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`/api/trips/${id}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.trip) {
            // Merge: prefer local bookings if the server has fewer (server is in-memory, loses on restart)
            const serverTrip = data.trip;
            // Re-read IndexedDB for freshest bookings
            try {
              const localRepo2 = new IndexedDbTripRepository();
              const localFresh = await localRepo2.get(id);
              if (localFresh) {
                if ((localFresh.bookings?.length || 0) > (serverTrip.bookings?.length || 0)) {
                  serverTrip.bookings = localFresh.bookings;
                }
                if (localFresh.transport && !serverTrip.transport) {
                  serverTrip.transport = localFresh.transport;
                }
                if (localFresh.checklist) {
                  serverTrip.checklist = localFresh.checklist;
                }
              }
            } catch {
              // Ignore local freshness merge failures and fall back to server data.
            }
            const withBreakdown = {
              ...serverTrip,
              budgetBreakdown: serverTrip.budgetBreakdown || calculateBudgetBreakdown(serverTrip),
            };
            setTrip(withBreakdown);
            setChecklist(getTripChecklist(serverTrip));
            localStorage.setItem("lastOpenedTripId", serverTrip.id);
            localStorage.setItem("lastOpenedTripName", serverTrip.name);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.warn("[TripDashboard] Server sync failed, using IndexedDB data", error);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      window.removeEventListener("trip-updated", syncFromTripEvent);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [tripId]);

  const persistTrip = async (updated: Trip) => {
    const localRepo = new IndexedDbTripRepository();
    await localRepo.upsert(updated);
    fetch('/api/trips/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip: updated }),
    }).catch(err => console.warn("[sync] failed", err));
  };

  const saveChecklist = async (nextChecklist: ChecklistItem[]) => {
    if (!trip) return;

    const updated = { ...trip, checklist: nextChecklist };
    setChecklist(nextChecklist);
    setTrip(updated);

    try {
      await persistTrip(updated);
    } catch (error) {
      console.error("[checklist] failed to save", error);
      showToast("Could not save checklist. Please try again.");
    }
  };

  const addChecklistItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newChecklistItem.trim();
    if (!text || !trip) return;

    setNewChecklistItem("");
    await saveChecklist([
      ...checklist,
      { id: `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, completed: false },
    ]);
  };

  const toggleChecklistItem = (itemId: string) => {
    void saveChecklist(checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteChecklistItem = (itemId: string) => {
    void saveChecklist(checklist.filter(item => item.id !== itemId));
  };

  const handleSetBudget = async (newBudget: number) => {
    if (!trip) return;
    const formatted = `₹${newBudget.toLocaleString('en-IN')}`;
    const updated = { ...trip, budget: formatted };
    updated.budgetBreakdown = calculateBudgetBreakdown(updated);
    setTrip(updated);

    await persistTrip(updated);
    showToast(`Budget set to ₹${newBudget.toLocaleString('en-IN')}`);
  };

  

  const handleReplanWithBudget = async (budget: number) => {
    if (!trip) return;
    setReplanningDay(null);
    // validation
    if (!budget || typeof budget !== 'number' || isNaN(budget) || budget <= 0) {
      showToast('Please enter a valid positive budget.');
      return;
    }
    // show loading
    showToast('Replanning itinerary — this may take a few seconds...');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a full itinerary within a budget of ₹${budget}. Use the createItinerary tool with the budget parameter.`,
          tripId: trip.id,
          // agent tools read trip from repository; include trip in payload to ensure local changes are considered
          trip,
        }),
      });
      const data = await res.json();
      // The agent route returns artifacts and also may include trip and result fields
      if (data.result?.itinerary && data.result?.budgetBreakdown) {
        const updated: Trip = {
          ...trip,
          itinerary: data.result.itinerary,
          budgetBreakdown: data.result.budgetBreakdown,
          budgetRecommendations: (data.result.recommendations || data.recommendations || trip.budgetRecommendations) as string[] | undefined,
        } as Trip;
        // persist and refresh
        await persistTrip(updated);
        setTrip(updated);
        showToast('Replanned itinerary with budget applied');
      } else if (data.trip) {
        // server returned updated trip
        const updatedTrip = data.trip as Trip;
        // Ensure budgetBreakdown is present
        updatedTrip.budgetBreakdown = updatedTrip.budgetBreakdown || calculateBudgetBreakdown(updatedTrip);
        await persistTrip(updatedTrip);
        setTrip(updatedTrip);
        showToast('Replanned itinerary with budget applied');
      } else {
        showToast('Failed to replan with budget');
      }
    } catch (err) {
      console.warn(err);
      showToast("Error replanning day.");
    } finally {
    }
  };

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number>(0);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleEditActivityClick = (idOrNew: string, dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    if (idOrNew.startsWith('new_')) {
      setEditingActivity(null);
    } else {
      const day = trip?.itinerary?.days[dayIndex];
      const act = day?.activities.find(a => a.id === idOrNew);
      setEditingActivity(act || null);
    }
    setEditSheetOpen(true);
  };

  const handleSaveActivitySheet = async (activity: Activity) => {
    setEditSheetOpen(false);
    if (!trip || !trip.itinerary) return;

    const days = [...trip.itinerary.days];
    const targetDay = days[editingDayIndex];
    if (!targetDay) return;

    let newActivities = [...targetDay.activities];
    if (editingActivity) {
      newActivities = newActivities.map(a => a.id === activity.id ? activity : a);
    } else {
      newActivities.push({ ...activity, id: `act_custom_${Date.now()}` });
    }
    newActivities.sort((a, b) => a.startTime.localeCompare(b.startTime));

    days[editingDayIndex] = { ...targetDay, activities: newActivities };
    const updated = { ...trip, itinerary: { days } };
    updated.budgetBreakdown = calculateBudgetBreakdown(updated);
    setTrip(updated);

    await persistTrip(updated);
    showToast(editingActivity ? "Activity updated" : "Activity added");
  };

  const handleRemoveActivity = async (activityId: string) => {
    if (!trip || !trip.itinerary) return;

    let removed = false;
    const newDays = trip.itinerary.days.map(d => ({
      ...d,
      activities: d.activities.filter(a => {
        if (a.id === activityId) { removed = true; return false; }
        return true;
      })
    }));

    if (!removed) return;
    const updated = { ...trip, itinerary: { days: newDays } };
    updated.budgetBreakdown = calculateBudgetBreakdown(updated);
    setTrip(updated);

    await persistTrip(updated);
    showToast("Activity removed");
  };

  const handleCancelBooking = async (bookingId: string) => {
    // Show confirmation modal before cancelling
    if (!trip || !trip.bookings) return;
    setPendingCancelId(bookingId);
    setShowCancelConfirm(true);
  };

  const performCancel = async (bookingId: string) => {
    if (!trip || !trip.bookings || isCancelling) return;
    setIsCancelling(true);
    const newBookings = trip.bookings.map(b =>
      b.id === bookingId ? { ...b, status: 'cancelled' } : b
    );
    const updated = { ...trip, bookings: newBookings };
    updated.budgetBreakdown = calculateBudgetBreakdown(updated);
    setTrip(updated);
    try {
      await persistTrip(updated);
      showToast("Booking cancelled");
    } catch {
      showToast("Failed to persist cancellation. Please try again.");
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
      setPendingCancelId(null);
    }
  };

  const handleReplanDay = async (dayIndex: number) => {
    if (!trip) return;
    setReplanningDay(dayIndex);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          message: `Please replan Day ${dayIndex + 1} because of rain. Replace outdoor activities with indoor alternatives. Do it immediately using the replanDay tool.`
        })
      });
      const data = await res.json();
      if (data.trip) {
        setTrip(data.trip);
        showToast(`Day ${dayIndex + 1} replanned for rain.`);
      } else {
        showToast("Failed to replan day.");
      }
    } catch {
      showToast("Error replanning day.");
    } finally {
      setReplanningDay(null);
    }
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-ink-500 text-sm">Loading trip...</p>
    </div>
  );

  if (!trip) return (
    <div className="p-8 text-center">
      <p className="text-coral-600 font-medium">Trip not found.</p>
      <Button className="mt-4" onClick={() => router.push('/trips')}>Back to Trips</Button>
    </div>
  );

  const profile = getDestinationProfile(trip.destination, trip.preferences);
  const days = trip.itinerary?.days || [];
  // Always compute budget breakdown even if not stored
  const budgetBreakdown = trip.budgetBreakdown || calculateBudgetBreakdown(trip);

  // Derive origin coordinates: prefer selectedHotel, hotel booking coords, then destination center
  const originCoords = resolveOriginCoords(trip);

  const rainDaysWithOutdoorActivities = days.filter(day => {
    if (!day.date) return false;
    const forecast = weatherForecasts.find(f => f.date === day.date);
    if (!forecast || forecast.precipitationMm === 0) return false;

    // Check if day has outdoor activities
    const hasOutdoor = day.activities.some(act => act.category === 'nature');
    return hasOutdoor && !dismissedRainDays.includes(day.dayIndex);
  });

  return (
    <div className="min-h-dvh bg-cream-50  pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12 overflow-x-hidden">
      <PageHeader
        title=""
        showBack
        rightAction={
          <IconButton
            icon={<Share2 size={20} />}
            variant="ghost"
            aria-label="Share trip"
            onClick={async () => {
              const url = `${window.location.origin}/trip/${trip.id}`;
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: trip.name,
                    text: `View my trip to ${trip.destination}.`,
                    url,
                  });
                  return;
                }
                await navigator.clipboard.writeText(url);
                showToast("Trip link copied!");
              } catch (error) {
                if (error instanceof Error && error.name === "AbortError") return;
                showToast("Could not share or copy trip link.");
              }
            }}
          />
        }
      />

      <main className="max-w-5xl mx-auto w-full px-4 md:px-8 flex flex-col md:flex-row gap-8 overflow-x-hidden">

        {/* Left Column - Main Content */}
        <div className="flex-1">
          {/* Hero Card */}
          <div className={`relative overflow-hidden rounded-cardLg p-8 md:p-12 mb-8 bg-linear-to-br ${profile.heroBg} shadow-sm border border-white/20`}>
            <div className="absolute top-4 right-4 opacity-50 text-8xl pointer-events-none select-none">
              {profile.emoji}
            </div>
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-ink-900 mb-2">
                {trip.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-ink-700 font-medium">
                <span className="bg-white/40  px-3 py-1 rounded-pill backdrop-blur-sm">{trip.destination}</span>
                {trip.destinationProfile?.researchQuality === 'fallback' && (
                  <span className="border border-sage-500 text-sage-800 bg-sage-100/50 px-3 py-1 rounded-pill text-sm backdrop-blur-sm font-semibold">
                    Starter suggestions — limited data for {trip.destination}. Edit freely.
                  </span>
                )}
                <span>•</span>
                <span>{trip.dates || 'Dates TBD'}</span>
                <span>•</span>
                <span>{trip.travelers} Traveler{trip.travelers !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Mobile Budget Card */}
          <div className="md:hidden mb-8">
            <BudgetCard
              breakdown={budgetBreakdown}
              onSetBudget={handleSetBudget}
              trip={trip}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-cream-200 mb-6 overflow-x-auto">
            {(['itinerary', 'map', 'bookings', 'notes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700'
                }`}
              >
                {tab === "notes" ? "Checklist" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-100">
            {activeTab === 'itinerary' && (
              <div>
                {rainDaysWithOutdoorActivities.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {rainDaysWithOutdoorActivities.map(rainDay => (
                      <div key={rainDay.dayIndex} className="bg-sky-50  border border-sky-200  rounded-cardLg p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-1">🌧️</span>
                          <div>
                            <p className="font-bold text-sky-900 ">Rain is expected on Day {rainDay.dayIndex + 1}.</p>
                            <p className="text-sm text-sky-700 ">Would you like to replan this day for indoor activities?</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 md:flex-none border-sky-200 bg-white  text-sky-700  hover:bg-sky-100 "
                            onClick={() => setDismissedRainDays(prev => [...prev, rainDay.dayIndex])}
                          >
                            Keep as is
                          </Button>
                          <Button 
                            size="sm"
                            className="flex-1 md:flex-none bg-sky-600 hover:bg-sky-700 text-white"
                            onClick={() => handleReplanDay(rainDay.dayIndex)}
                            disabled={replanningDay === rainDay.dayIndex}
                          >
                            {replanningDay === rainDay.dayIndex ? 'Replanning...' : `Replan Day ${rainDay.dayIndex + 1}`}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {days.length === 0 ? (
                  <div className="text-center py-12 bg-cream-50  rounded-cardLg border border-cream-200 border-dashed">
                    <p className="text-ink-500 mb-4">No itinerary generated yet.</p>
                    <Button onClick={() => router.push('/chat')}>Ask Voyage to create one</Button>
                  </div>
                ) : (
                  <div>
                    {days.map(day => (
                      <DayCard
                        key={day.dayIndex}
                        day={day}
                        destination={trip.destination}
                        destinationCoords={trip.destinationCoords}
                        originCoords={originCoords}
                        onEditActivity={(id) => handleEditActivityClick(id, day.dayIndex)}
                        onRemoveActivity={handleRemoveActivity}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div className="h-125">
                <TripMap 
                  activities={days.flatMap(d => d.activities)} 
                  originCoords={originCoords}
                  destination={trip.destination}
                  destinationCoords={trip.destinationCoords}
                />
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-lg">Your Bookings</h3>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/chat?tripId=${trip.id}`)}>+ Book something</Button>
                </div>
                
                {(!trip.bookings || trip.bookings.length === 0) ? (
                  <div className="text-center py-12 bg-cream-50  rounded-cardLg border border-cream-200  border-dashed">
                    <p className="text-4xl mb-3">🎟️</p>
                    <p className="text-ink-700  font-medium">No bookings yet</p>
                    <p className="text-ink-500 text-sm mt-1">Ask Voyage AI to find hotels, restaurants or activities and tap Book Now.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push(`/chat?tripId=${trip.id}`)}>Ask Voyage AI</Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {trip.bookings.map((booking: NonNullable<Trip["bookings"]>[number]) => {
                      const isTransport = booking.type === 'transport' || ['flight', 'train', 'bus'].includes(booking.itemType);
                      const demo = typeof booking.message === 'string' && booking.message.toLowerCase().includes('prototype');
                      const operator = booking.details?.operator || booking.details?.provider || booking.details?.carrier;
                      const origin = booking.details?.origin || booking.details?.from;
                      const destination = booking.details?.destination || booking.details?.to;
                      const departure = booking.details?.departureDateTime || booking.details?.departureTime || booking.details?.departure;
                      const arrival = booking.details?.arrivalDateTime || booking.details?.arrivalTime || booking.details?.arrival;
                      const passengers = booking.details?.passengers || booking.details?.passengerCount || booking.details?.pax;
                      const bookingDates = booking.type === 'hotel'
                        ? [booking.dates?.checkIn || booking.details?.checkIn, booking.dates?.checkOut || booking.details?.checkOut].filter(Boolean).join(' – ')
                        : booking.dates?.travelDate || booking.details?.travelDate || booking.details?.departureTime;

                      return (
                        <div key={booking.id} className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 flex flex-col md:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                                {booking.type === 'hotel' ? '🏨 Hotel' : booking.itemType === 'flight' ? '✈️ Flight' : booking.itemType === 'train' ? '🚆 Train' : booking.itemType === 'bus' ? '🚌 Bus' : isTransport ? '🚆 Transport' : booking.itemType}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
                                ${booking.status === 'confirmed' ? 'bg-sage-100 text-sage-700' : 
                                  booking.status === 'cancelled' ? 'bg-coral-100 text-coral-700' : 
                                  'bg-cream-100 text-ink-600'}`}>
                                {booking.status}
                              </span>
                              {demo && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800">Demo</span>
                              )}
                            </div>

                            <div className="font-bold text-ink-900 text-lg">
                              {booking.details?.itemName || (typeof booking.itemSnapshot?.name === 'string' ? booking.itemSnapshot.name : booking.itemId)}
                            </div>
                            {bookingDates && (
                              <div className="text-sm text-ink-600 mt-1">
                                {booking.type === 'hotel' ? 'Stay: ' : 'Date: '}{bookingDates}
                              </div>
                            )}

                            {isTransport ? (
                              <div className="text-sm text-ink-700 mt-2 space-y-1">
                                {operator && <div><span className="font-medium">Provider:</span> {operator}</div>}
                                <div className="flex gap-2 flex-wrap">
                                  {origin && <div><span className="font-medium">From:</span> {origin}</div>}
                                  {destination && <div><span className="font-medium">To:</span> {destination}</div>}
                                </div>
                                <div className="flex gap-4 flex-wrap">
                                  {departure && <div><span className="font-medium">Departs:</span> {departure}</div>}
                                  {arrival && <div><span className="font-medium">Arrives:</span> {arrival}</div>}
                                </div>
                                {typeof passengers !== 'undefined' && <div><span className="font-medium">Passengers:</span> {passengers}</div>}
                                {booking.confirmationCode && <div className="text-xs text-ink-500 font-mono">Ref: {booking.confirmationCode}</div>}
                                <div className="text-sm text-ink-500 font-mono mt-1">ID: {booking.id}</div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm text-ink-500 font-mono mt-1">ID: {booking.id}</div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3">
                            <div className="font-bold text-sage-600 text-xl">₹{booking.price?.toLocaleString()}</div>
                            {booking.status !== 'cancelled' && (
                              <Button variant="ghost" size="sm" className="text-coral-600 hover:bg-coral-50" onClick={() => handleCancelBooking(booking.id)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <section className="bg-cream-50 rounded-cardLg p-4 sm:p-5 shadow-sm border border-cream-200">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display font-bold text-ink-900">Trip Checklist</h2>
                    <p className="text-xs text-ink-500 mt-1">
                      {checklist.filter(item => item.completed).length} of {checklist.length} completed
                    </p>
                  </div>
                </div>
                <form onSubmit={addChecklistItem} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={event => setNewChecklistItem(event.target.value)}
                    placeholder="Add something to remember..."
                    aria-label="New checklist item"
                    className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-sage-300"
                  />
                  <Button type="submit" disabled={!newChecklistItem.trim()} className="shrink-0 gap-1.5">
                    <Plus size={16} />
                    Add
                  </Button>
                </form>
                {checklist.length > 0 ? (
                  <ul className="space-y-2">
                    {checklist.map(item => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(item.id)}
                          aria-label={`${item.completed ? "Mark incomplete" : "Mark complete"}: ${item.text}`}
                          className="h-4 w-4 shrink-0 accent-sage-600"
                        />
                        <span className={`min-w-0 flex-1 break-words text-sm ${item.completed ? "text-ink-400 line-through" : "text-ink-700"}`}>
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteChecklistItem(item.id)}
                          aria-label={`Delete ${item.text}`}
                          className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-cream-300 px-3 py-6 text-center text-sm text-ink-400">
                    Your checklist is empty. Add a reminder to get started.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Right Column - Desktop Sidebar */}
        <div className="hidden md:block w-80 shrink-0 space-y-6">
          <BudgetCard
            breakdown={budgetBreakdown}
            onSetBudget={handleSetBudget}
            trip={trip}
          />

          {/* Real weather from Open-Meteo */}
          <WeatherCard forecasts={weatherForecasts} loading={weatherLoading} error={weatherError} />

          <div className="flex flex-col gap-2">
            <Button
              className="w-full flex justify-center items-center gap-2"
              size="lg"
              onClick={() => router.push(`/chat?tripId=${trip.id}`)}
            >
              <MessageSquare size={18} />
              Ask Voyage AI
            </Button>
            <Button
              className="w-full flex justify-center items-center gap-2"
              size="lg"
              variant="outline"
              onClick={() => router.push(`/guide?destination=${encodeURIComponent(trip.destination)}&tripId=${trip.id}`)}
            >
              <Compass size={18} />
              Ask the Guide
            </Button>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-cream-50/90  backdrop-blur-md border-t border-cream-200 flex gap-3 z-30">
        <Button
          className="flex-1 flex justify-center items-center gap-2"
          onClick={() => router.push(`/chat?tripId=${trip.id}`)}
        >
          <MessageSquare size={18} />
          Chat
        </Button>
        <Button
          className="flex-1 flex justify-center items-center gap-2"
          variant="outline"
          onClick={() => router.push(`/guide?destination=${encodeURIComponent(trip.destination)}&tripId=${trip.id}`)}
        >
          <Compass size={18} />
          Guide
        </Button>
      </div>

      <ActivityEditSheet
        isOpen={editSheetOpen}
        activity={editingActivity}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveActivitySheet}
      />
      {/* Cancel confirmation modal */}
      {showCancelConfirm && pendingCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 id="cancel-modal-title" className="text-lg font-display font-bold text-ink-900 mb-2">Cancel this booking?</h3>
            <p className="text-sm text-ink-600 mb-6">Are you sure you want to cancel this booking?</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                disabled={isCancelling}
                onClick={() => { setShowCancelConfirm(false); setPendingCancelId(null); }}
              >
                No, Keep Booking
              </Button>
              <Button
                disabled={isCancelling}
                onClick={() => performCancel(pendingCancelId)}
                className="bg-coral-600 text-white hover:bg-coral-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <TripDashboard />
    </Suspense>
  );
}
