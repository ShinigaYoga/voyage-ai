"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Search, X } from "lucide-react";
import { TripsEmptyState } from "@/components/trips/TripsEmptyState";
import { TripCard } from "@/components/trips/TripCard";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { Trip } from "@/lib/types";

interface TripToast {
  message: string;
  undo?: { trip: Trip; index: number };
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [confirmTrip, setConfirmTrip] = useState<Trip | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<TripToast | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log("[TripsPage] mount effect starting");
    let cancelled = false;

    async function loadTrips() {
      try {
        const repo = new IndexedDbTripRepository();
        const data = await repo.list();
        if (!cancelled) {
          setTrips(data);
          setLoading(false);
          console.log("[TripsPage] mount effect done");
        }
      } catch (e) {
        console.error("[TripsPage] mount effect threw:", e);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadTrips();

    const fallbackTimer = setTimeout(() => {
      if (!cancelled && loading) {
        console.warn("[TripsPage] fallback triggered after 3s");
        setLoading(false);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim().toLocaleLowerCase()), 150);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    if (!confirmTrip) return;
    cancelDeleteRef.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmTrip(null);
        return;
      }
      if (event.key !== "Tab" || !deleteDialogRef.current) return;
      const focusable = Array.from(deleteDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [confirmTrip]);

  const showToast = (nextToast: TripToast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(nextToast);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, nextToast.undo ? 6000 : 4000);
  };

  const handleDeleteTrip = async () => {
    if (!confirmTrip || removingId) return;
    const trip = confirmTrip;
    const index = trips.findIndex(item => item.id === trip.id);
    setConfirmTrip(null);
    setRemovingId(trip.id);
    try {
      const repo = new IndexedDbTripRepository();
      await repo.deleteTrip(trip.id);
      await new Promise(resolve => setTimeout(resolve, 200));
      setTrips(current => current.filter(item => item.id !== trip.id));
      setRemovingId(null);
      showToast({ message: "Trip deleted", undo: { trip, index } });
    } catch (error) {
      console.error("[TripsPage] failed to delete trip:", error);
      setRemovingId(null);
      showToast({ message: "Couldn't delete trip. Please try again." });
    }
  };

  const handleUndoDelete = async () => {
    if (!toast?.undo) return;
    const { trip, index } = toast.undo;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    try {
      const repo = new IndexedDbTripRepository();
      await repo.upsert(trip);
      setTrips(current => {
        if (current.some(item => item.id === trip.id)) return current;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, trip);
        return next;
      });
      setToast(null);
    } catch (error) {
      console.error("[TripsPage] failed to undo trip deletion:", error);
      showToast({ message: "Couldn't restore trip. Please try again." });
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText("");
    setDebouncedSearch("");
  };

  const visibleTrips = debouncedSearch
    ? trips.filter(trip => {
        const origin = (trip as Trip & { origin?: string }).origin || "";
        return [trip.name, trip.destination, origin, trip.dates || ""]
          .some(value => value.toLocaleLowerCase().includes(debouncedSearch));
      })
    : trips;

  const handleCreateTrip = async () => {
    try {
      const repo = new IndexedDbTripRepository();
      const newTrip = await repo.create({
        name: "Untitled Trip",
        destination: "Unknown",
        travelers: 1,
      });

      // Navigate immediately — never block on server sync
      router.push('/chat');

      // Fire-and-forget server sync
      fetch("/api/trips/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: newTrip }),
      }).catch(() => {});
    } catch (e) {
      console.error(e);
      router.push('/chat');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader 
        title="Your Trips" 
        rightAction={(
          <div className="flex items-center gap-2">
            {searchOpen && (
              <div className="flex min-w-0 items-center rounded-xl border border-cream-300 bg-white px-3">
                <Search size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Escape") closeSearch();
                  }}
                  placeholder="Search trips"
                  aria-label="Search trips"
                  className="w-32 bg-transparent px-2 py-2 text-sm text-ink-900 outline-none sm:w-48"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close and clear trip search"
                  className="rounded-full p-1 text-ink-500 hover:bg-cream-100"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label={searchOpen ? "Close trip search" : "Search trips"}
              onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
              className="rounded-full p-2 text-ink-600 hover:bg-cream-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-600"
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>
        )}
      />
      
      <div className="flex-1 px-4 md:px-0 mt-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-8 h-8 rounded-full border-4 border-sage-200 border-t-sage-600 animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <TripsEmptyState onCreateTrip={handleCreateTrip} />
        ) : (
          <div className="max-w-md mx-auto w-full">
            {searchOpen && (
              <p className="mb-3 text-xs text-ink-500" aria-live="polite">
                {visibleTrips.length} of {trips.length} trips
              </p>
            )}
            {visibleTrips.length === 0 ? (
              <div className="rounded-card border border-cream-200 bg-white p-6 text-center shadow-soft">
                <p className="font-medium text-ink-800">No trips match '{searchText.trim()}'</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setDebouncedSearch("");
                    searchInputRef.current?.focus();
                  }}
                  className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-sage-700 hover:bg-sage-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-600"
                >
                  Clear
                </button>
              </div>
            ) : visibleTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                removing={removingId === trip.id}
                onDelete={setConfirmTrip}
              />
            ))}
          </div>
        )}
      </div>
      {confirmTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-trip-title"
            aria-describedby="delete-trip-description"
            className="w-full max-w-sm rounded-card border border-cream-200 bg-white p-5 shadow-lift"
          >
            <h2 id="delete-trip-title" className="font-display text-lg font-bold text-ink-900">
              Delete {confirmTrip.name}?
            </h2>
            <p id="delete-trip-description" className="mt-2 text-sm text-ink-600">
              This also removes its itinerary and bookings.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={() => setConfirmTrip(null)}
                className="rounded-lg border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-cream-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                className="rounded-lg bg-coral-600 px-4 py-2 text-sm font-bold text-white hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          role={toast.undo ? "status" : "alert"}
          aria-live={toast.undo ? "polite" : "assertive"}
          className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-4 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-lift"
        >
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={handleUndoDelete}
              className="shrink-0 rounded-lg px-2 py-1 font-bold text-sage-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
