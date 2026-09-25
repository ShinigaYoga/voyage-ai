"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { TripsEmptyState } from "@/components/trips/TripsEmptyState";
import { TripCard } from "@/components/trips/TripCard";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { Trip } from "@/lib/types";

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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
        rightAction={<IconButton icon={<Search size={20} />} variant="ghost" />}
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
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
