"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { BookingService } from "@/lib/services/booking/BookingService";
import { Trip } from "@/lib/types";

import { Suspense } from "react";

function BookingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const type = searchParams.get("type");
  const itemId = searchParams.get("itemId");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Form State
  const [travelerName, setTravelerName] = useState("");
  const [contact, setContact] = useState("");
  const [requests, setRequests] = useState("");

  useEffect(() => {
    if (tripId) {
      const repo = new IndexedDbTripRepository();
      repo.get(tripId).then(t => setTrip(t));
    }
  }, [tripId]);

  const mockPrice = type === 'hotel' ? 12500 : type === 'flight' ? 8000 : 2500;
  const mockItemName = type === 'hotel' ? 'Luxury Stay' : type === 'restaurant' ? 'Fine Dining' : 'Transport/Activity';

  const handleNext = () => setStep(s => (s + 1) as any);
  const handleBack = () => setStep(s => (s - 1) as any);

  const handleConfirm = async () => {
    setLoading(true);
    const service = new BookingService();
    const result = await service.bookItem({
      tripId: tripId!,
      itemId: itemId || "item-123",
      itemType: (type as any) || "hotel",
      price: mockPrice,
      details: { travelerName, contact, requests, itemName: mockItemName }
    });

    if (result.status === 'confirmed' && tripId) {
      const repo = new IndexedDbTripRepository();
      // Fetch the latest copy from IndexedDB directly using tripId
      const freshTrip = await repo.get(tripId);
      if (freshTrip) {
        const updatedBookings = [...(freshTrip.bookings || []), result];
        const updatedTrip = { ...freshTrip, bookings: updatedBookings };
        // Persist to IndexedDB
        await repo.upsert(updatedTrip);
        // Sync to server so background fetch doesn't overwrite with stale data
        try {
          await fetch('/api/trips/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip: updatedTrip }),
          });
        } catch (e) {
          console.warn('[booking] server sync failed, IndexedDB is source of truth', e);
        }
      }
    }

    setBookingResult(result);
    setStep(4);
    setLoading(false);
  };

  if (!tripId) return <div className="p-8 text-center text-ink-500">Missing tripId</div>;

  return (
    <div className="flex flex-col min-h-screen bg-cream-50 dark:bg-[#141412]">
      <PageHeader title={step === 4 ? "Booking Confirmed" : "New Booking"} />
      
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {step < 4 && (
          <div className="flex justify-between items-center mb-6">
            <div className={`text-sm font-bold ${step >= 1 ? 'text-sage-600' : 'text-ink-400'}`}>1. Details</div>
            <div className="w-8 h-px bg-cream-200"></div>
            <div className={`text-sm font-bold ${step >= 2 ? 'text-sage-600' : 'text-ink-400'}`}>2. Review</div>
            <div className="w-8 h-px bg-cream-200"></div>
            <div className={`text-sm font-bold ${step >= 3 ? 'text-sage-600' : 'text-ink-400'}`}>3. Confirm</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-display font-bold">Traveler Details</h2>
            <Card className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Primary Traveler</label>
                <input 
                  type="text" 
                  value={travelerName} 
                  onChange={e => setTravelerName(e.target.value)}
                  className="w-full bg-cream-50 dark:bg-black/20 border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Contact Email/Phone</label>
                <input 
                  type="text" 
                  value={contact} 
                  onChange={e => setContact(e.target.value)}
                  className="w-full bg-cream-50 dark:bg-black/20 border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="Email or phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Special Requests</label>
                <textarea 
                  value={requests} 
                  onChange={e => setRequests(e.target.value)}
                  className="w-full bg-cream-50 dark:bg-black/20 border border-cream-200 rounded-lg p-2.5 text-sm h-24"
                  placeholder="Any special requests or requirements..."
                />
              </div>
            </Card>
            <div className="pt-4">
              <Button className="w-full" onClick={handleNext} disabled={!travelerName || !contact}>Continue to Review</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-display font-bold">Review Booking</h2>
            <Card className="p-4 space-y-4">
              <div className="flex justify-between items-start border-b border-cream-200 pb-4">
                <div>
                  <div className="text-lg font-bold">{mockItemName}</div>
                  <div className="text-sm text-ink-500 capitalize">{type}</div>
                </div>
                <div className="text-lg font-bold text-sage-600">₹{mockPrice.toLocaleString()}</div>
              </div>
              <div className="space-y-2 py-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Trip</span>
                  <span className="font-medium">{trip?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Traveler</span>
                  <span className="font-medium">{travelerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Contact</span>
                  <span className="font-medium">{contact}</span>
                </div>
              </div>
            </Card>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleBack}>Back</Button>
              <Button className="flex-1" onClick={handleNext}>Proceed to Confirm</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-display font-bold">Confirm Booking</h2>
            
            <div className="bg-coral-50 border border-coral-200 p-4 rounded-xl text-coral-800 text-sm mb-4">
              <span className="font-bold">Note:</span> This is a prototype booking. No real payment is processed.
            </div>

            <Card className="p-4 space-y-4 bg-sage-50/50 border-sage-200">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Due</span>
                <span className="text-sage-700">₹{mockPrice.toLocaleString()}</span>
              </div>
            </Card>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleBack} disabled={loading}>Back</Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? "Processing..." : "Create booking record"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && bookingResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center py-8">
            <div className="w-16 h-16 bg-sage-100 text-sage-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
              {bookingResult.status === 'confirmed' ? '✅' : '❌'}
            </div>
            
            <h2 className="text-2xl font-display font-bold">
              {bookingResult.status === 'confirmed' ? 'Booking Confirmed' : 'Booking Failed'}
            </h2>
            
            <p className="text-sm text-ink-600 max-w-xs mx-auto">
              Booking recorded. This is a prototype — no external reservation was made.
            </p>

            <Card className="p-4 text-left mt-6 bg-white dark:bg-black/20">
              <div className="flex justify-between py-2 border-b border-cream-100">
                <span className="text-ink-500 text-sm">Booking ID</span>
                <span className="font-mono text-sm font-bold">{bookingResult.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-cream-100">
                <span className="text-ink-500 text-sm">Status</span>
                <span className="text-sm font-bold uppercase text-sage-600">{bookingResult.status}</span>
              </div>
              {bookingResult.confirmationCode && (
                <div className="flex justify-between py-2">
                  <span className="text-ink-500 text-sm">Confirmation Code</span>
                  <span className="text-sm font-bold tracking-widest">{bookingResult.confirmationCode}</span>
                </div>
              )}
            </Card>

            <div className="pt-6">
              <Button className="w-full" onClick={() => router.push(`/trip/${tripId}?tab=bookings`)}>
                View in Trip Dashboard
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BookingWizard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-500">Loading booking wizard...</div>}>
      <BookingWizardContent />
    </Suspense>
  );
}
