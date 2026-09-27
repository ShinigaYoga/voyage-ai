"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trip, Activity } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { DaySelectorPills } from "@/components/trip/DaySelectorPills";
import { DraggableActivityList } from "@/components/trip/DraggableActivityList";
import { ActivityEditSheet } from "@/components/trip/ActivityEditSheet";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { resolveOriginCoords } from "@/lib/itinerary/coordinateUtils";

export default function ItineraryPage() {
  const { tripId } = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.trip) setTrip(data.trip);
        }
      } catch (e) {
        console.error("Failed to load trip", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  if (loading) return <div className="p-8 text-center text-ink-500">Loading itinerary...</div>;
  if (!trip || !trip.itinerary) return <div className="p-8 text-center text-coral-600">No itinerary found.</div>;

  const days = trip.itinerary.days;
  const currentDay = days[activeDay] || days[0];

  // Derive origin: prefer selectedHotel, hotel booking, then destination center
  const originCoords = resolveOriginCoords(trip);

  const syncToServerAndRefresh = async (updatedTrip: Trip, instruction: string) => {
    // 1. Optimistic update
    setTrip(updatedTrip);
    
    // 2. Sync to get real budget recalculation
    try {
      await fetch('/api/trips/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip: updatedTrip }),
      });
      // 3. Optional: could use /api/agent to actually log the change in chat
      // but for this UI-only mutation, syncing is enough. Let's just fetch fresh.
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.trip) setTrip(data.trip);
      }
    } catch (e) {
      console.error("Failed to sync", e);
    }
  };

  const handleReorder = (newOrder: Activity[]) => {
    const updatedDays = [...days];
    updatedDays[activeDay] = { ...currentDay, activities: newOrder };
    const updatedTrip = { ...trip, itinerary: { days: updatedDays } };
    syncToServerAndRefresh(updatedTrip, "Reordered activities");
  };

  const handleRemove = (id: string) => {
    const updatedDays = [...days];
    updatedDays[activeDay] = {
      ...currentDay,
      activities: currentDay.activities.filter(a => a.id !== id)
    };
    const updatedTrip = { ...trip, itinerary: { days: updatedDays } };
    syncToServerAndRefresh(updatedTrip, "Removed activity");
  };

  const openAddSheet = () => {
    setEditingActivity(null);
    setEditSheetOpen(true);
  };

  const openEditSheet = (id: string) => {
    const act = currentDay.activities.find(a => a.id === id);
    if (act) {
      setEditingActivity(act);
      setEditSheetOpen(true);
    }
  };

  const handleSaveActivity = (activity: Activity) => {
    setEditSheetOpen(false);
    const updatedDays = [...days];
    let newActivities = [...currentDay.activities];

    if (editingActivity) {
      // Update existing
      newActivities = newActivities.map(a => a.id === activity.id ? activity : a);
    } else {
      // Add new
      newActivities.push({ ...activity, id: `act_custom_${Date.now()}` });
    }

    // Sort by time
    newActivities.sort((a, b) => a.startTime.localeCompare(b.startTime));

    updatedDays[activeDay] = { ...currentDay, activities: newActivities };
    const updatedTrip = { ...trip, itinerary: { days: updatedDays } };
    syncToServerAndRefresh(updatedTrip, editingActivity ? "Edited activity" : "Added activity");
  };

  return (
    <div className="min-h-[100dvh] bg-cream-50 dark:bg-[#141412] pb-12 flex flex-col">
      <div className="sticky top-0 z-20 bg-cream-50/90 backdrop-blur-md border-b border-cream-200">
        <PageHeader title="Itinerary" showBack />
        <DaySelectorPills 
          days={days} 
          activeDay={activeDay} 
          onSelect={setActiveDay} 
        />
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-8 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-ink-900">
            Day {currentDay.dayIndex + 1}
          </h2>
          <Button variant="outline" size="sm" onClick={openAddSheet} className="gap-2 bg-white">
            <Plus size={16} /> Add
          </Button>
        </div>

        <div className="bg-white dark:bg-cream-200 rounded-cardLg p-4 md:p-6 shadow-sm border border-cream-200 min-h-[50vh]">
          <DraggableActivityList 
            activities={currentDay.activities} 
            originCoords={originCoords}
            destination={trip.destination}
            onReorder={handleReorder}
            onEditActivity={openEditSheet}
            onRemoveActivity={handleRemove}
          />
        </div>
      </main>

      <ActivityEditSheet 
        isOpen={editSheetOpen}
        activity={editingActivity}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveActivity}
      />
    </div>
  );
}
