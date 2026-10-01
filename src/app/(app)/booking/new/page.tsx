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
  // Prefilled transport details from selection
  const provider = searchParams.get("provider");
  const prefilledPrice = searchParams.get("price");
  const departureTime = searchParams.get("departureTime");
  const arrivalTime = searchParams.get("arrivalTime");
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Form State
  const [travelerName, setTravelerName] = useState("");
  const [requests, setRequests] = useState("");
  const [passengerCount, setPassengerCount] = useState<number>(trip?.travelers || 1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // travelDate is free-text so prefilled departureTime (e.g. "14:30") always shows and validates
  const [travelDate, setTravelDate] = useState<string>(departureTime || "");
  const [seatClass, setSeatClass] = useState<string>("");
  // Editable transport fields — prefilled from URL params but user can change them
  const [editOperator, setEditOperator] = useState<string>(provider || "");
  const [editOrigin, setEditOrigin] = useState<string>(origin || "");
  const [editDestination, setEditDestination] = useState<string>(destination || "");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      const repo = new IndexedDbTripRepository();
      repo.get(tripId).then(t => setTrip(t));
    }
  }, [tripId]);

  const mockPrice = type === 'hotel' ? 12500 : type === 'flight' ? 8000 : 2500;
  const mockItemName = type === 'hotel' ? 'Luxury Stay' : type === 'restaurant' ? 'Fine Dining' : 'Transport/Activity';
  const prefillPriceNum = prefilledPrice ? Number(prefilledPrice) : null;
  const displayPrice = prefillPriceNum != null ? prefillPriceNum : mockPrice;
  const displayItemName = provider ? `${provider} (${type})` : mockItemName;

  const handleNext = () => {
    // Validate on proceeding from Details -> Review
    if (step === 1) {
      const errs: Record<string, string> = {};
      if (!travelerName || travelerName.trim().length === 0) errs.travelerName = 'Please provide passenger full name.';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please provide a valid email address.';
      if (!phone || phone.trim().length < 6) errs.phone = 'Please provide a contact phone number.';
      if (!Number.isFinite(passengerCount) || passengerCount < 1) errs.passengerCount = 'Passenger count must be at least 1.';
      if (!travelDate || travelDate.trim().length === 0) errs.travelDate = 'Please provide a travel date/time.';
      setValidationErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }
    setStep(s => (s + 1) as any);
  };
  const handleBack = () => setStep(s => (s - 1) as any);

  const persistBookingResult = async (result: any) => {
    if (!tripId) return;
    try {
      const repo = new IndexedDbTripRepository();
      const freshTrip = await repo.get(tripId);
      const updatedBookings = [...((freshTrip && freshTrip.bookings) || []), result];
      const updatedTrip = { ...(freshTrip || ({} as any)), bookings: updatedBookings } as any;
      await repo.upsert(updatedTrip);
      // Sync to server best-effort
      try {
        await fetch('/api/trips/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip: updatedTrip }),
        });
      } catch (e) {
        console.warn('[booking] server sync failed, IndexedDB is source of truth', e);
      }
      setPersistError(null);
      return true;
    } catch (e: any) {
      console.error('[booking] persistence failed', e);
      setPersistError('Saving booking locally failed. Please retry.');
      return false;
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setPersistError(null);
    const service = new BookingService();
    const resolvedItemName = editOperator ? `${editOperator} (${type})` : displayItemName;
    const request = {
      tripId: tripId!,
      itemId: itemId || 'item-transport',
      itemType: (type as any) || 'flight',
      price: displayPrice,
      details: {
        itemName: resolvedItemName,
        operator: editOperator || provider,
        origin: editOrigin || origin,
        destination: editDestination || destination,
        departureTime: travelDate || departureTime,
        arrivalTime,
        passengerName: travelerName,
        passengerCount,
        contact: { email, phone },
        seatClass,
        requests,
      },
    };

    const result = await service.bookItem(request as any);

    // If booking failed (simulated), let the user retry the booking action
    if (result.status !== 'confirmed') {
      setBookingResult(result);
      setStep(4);
      setLoading(false);
      return;
    }

    // Try persist; if it fails, keep bookingResult and allow retry
    const saved = await persistBookingResult(result);
    setBookingResult(result);
    setStep(4);
    setLoading(false);
    if (!saved) {
      // persistError already set by persistBookingResult
      return;
    }
  };

  if (!tripId) return <div className="p-8 text-center text-ink-500">Missing tripId</div>;

  return (
    <div className="flex flex-col min-h-screen bg-cream-50 ">
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
              {/* Transport details — editable, prefilled from selection */}
              {['flight', 'train', 'bus'].includes(type || '') && (
                <div className="pb-3 border-b border-cream-200 space-y-3">
                  <div className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                    {type === 'flight' ? '✈️' : type === 'train' ? '🚆' : '🚌'} Transport Details
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Operator / Provider</label>
                    <input
                      type="text"
                      value={editOperator}
                      onChange={e => setEditOperator(e.target.value)}
                      className="w-full bg-cream-50 border border-cream-200 rounded-lg p-2.5 text-sm"
                      placeholder="e.g. IndiGo, Rajdhani Express"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">From</label>
                      <input
                        type="text"
                        value={editOrigin}
                        onChange={e => setEditOrigin(e.target.value)}
                        className="w-full bg-cream-50 border border-cream-200 rounded-lg p-2.5 text-sm"
                        placeholder="Origin"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">To</label>
                      <input
                        type="text"
                        value={editDestination}
                        onChange={e => setEditDestination(e.target.value)}
                        className="w-full bg-cream-50 border border-cream-200 rounded-lg p-2.5 text-sm"
                        placeholder="Destination"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Primary Traveler</label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={e => setTravelerName(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="Full Name"
                />
                {validationErrors.travelerName && (
                  <div className="text-xs text-coral-700 mt-1">{validationErrors.travelerName}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Contact Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="Email address"
                />
                {validationErrors.email && (
                  <div className="text-xs text-coral-700 mt-1">{validationErrors.email}</div>
                )}
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1 mt-3">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="Phone number"
                />
                {validationErrors.phone && (
                  <div className="text-xs text-coral-700 mt-1">{validationErrors.phone}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Number of Passengers</label>
                <input
                  type="number"
                  min={1}
                  value={passengerCount}
                  onChange={e => setPassengerCount(Number(e.target.value))}
                  className="w-32 bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                />
                {validationErrors.passengerCount && (
                  <div className="text-xs text-coral-700 mt-1">{validationErrors.passengerCount}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Departure Date / Time</label>
                <input
                  type="text"
                  value={travelDate}
                  onChange={e => setTravelDate(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="e.g. 2024-12-15 or 14:30"
                />
                {validationErrors.travelDate && (
                  <div className="text-xs text-coral-700 mt-1">{validationErrors.travelDate}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Seat / Class (optional)</label>
                <input
                  type="text"
                  value={seatClass}
                  onChange={e => setSeatClass(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm"
                  placeholder="e.g., Economy, Business, Window seat"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">Special Requests</label>
                <textarea
                  value={requests}
                  onChange={e => setRequests(e.target.value)}
                  className="w-full bg-cream-50  border border-cream-200 rounded-lg p-2.5 text-sm h-24"
                  placeholder="Any special requests or requirements..."
                />
              </div>
            </Card>
            <div className="pt-4">
              <Button className="w-full" onClick={handleNext}>Continue to Review</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-display font-bold">Review Booking</h2>
            <Card className="p-4 space-y-4">
              <div className="flex justify-between items-start border-b border-cream-200 pb-4">
                <div>
                  <div className="text-lg font-bold">{editOperator || displayItemName}</div>
                  <div className="text-sm text-ink-500 capitalize">{type}</div>
                  {['flight', 'train', 'bus'].includes(type || '') && (
                    <div className="text-xs text-ink-600 mt-2 space-y-0.5">
                      {(editOrigin || editDestination) && (
                        <div><strong>Route:</strong> {editOrigin || '—'} → {editDestination || '—'}</div>
                      )}
                      {travelDate && <div><strong>Departs:</strong> {travelDate}</div>}
                      {arrivalTime && <div><strong>Arrives:</strong> {arrivalTime}</div>}
                    </div>
                  )}
                </div>
                <div className="text-lg font-bold text-sage-600">₹{displayPrice.toLocaleString()}</div>
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
                  <span className="text-ink-500">Passengers</span>
                  <span className="font-medium">{passengerCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Contact</span>
                  <span className="font-medium">{email}{phone ? ` / ${phone}` : ''}</span>
                </div>
                {seatClass && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Seat / Class</span>
                    <span className="font-medium">{seatClass}</span>
                  </div>
                )}
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
                <span className="text-sage-700">₹{displayPrice.toLocaleString()}</span>
              </div>
              <div className="pt-2 text-sm space-y-1">
                <div><strong>Provider:</strong> {editOperator || provider || '—'}</div>
                <div><strong>Route:</strong> {editOrigin || origin || '—'} → {editDestination || destination || '—'}</div>
                <div><strong>Departure:</strong> {travelDate || departureTime || '—'}</div>
                <div><strong>Arrival:</strong> {arrivalTime || '—'}</div>
                <div><strong>Passengers:</strong> {passengerCount}</div>
              </div>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleBack} disabled={loading}>Back</Button>
              <Button
                className="flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing…' : 'Confirm Booking'}
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

            <Card className="p-4 text-left mt-6 bg-white ">
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
