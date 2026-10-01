"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { Booking } from "@/lib/types";
import { BookingService } from "@/lib/services/booking/BookingService";
import {
  BookingDraft,
  getBookingDraft,
  updateBookingDraft,
} from "@/lib/services/booking/bookingDraftStore";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";

function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function BookingDraftPage() {
  const params = useParams<{ draftId: string }>();
  const router = useRouter();
  const profile = useUserProfile();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tripName, setTripName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [passengers, setPassengers] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const current = getBookingDraft(params.draftId);
    setDraft(current);
    if (current) {
      setPassengers(current.details.passengers || 1);
      setGuests(current.details.passengers || 1);
      setCheckIn(current.type === "hotel" ? current.details.date || "" : "");
      setGuestName(profile?.name || "");
      setContactEmail(profile?.email || "");
      new IndexedDbTripRepository()
        .get(current.details.tripId)
        .then((trip) => {
          if (!trip) {
            setError("This trip is no longer available. Return to chat and select an option again.");
            return;
          }
          setTripName(trip.name);
          setPassengers(current.details.passengers || trip.travelers || 1);
          setGuests(current.details.passengers || trip.travelers || 1);
        })
        .catch((loadError: unknown) => {
          console.error("[booking] failed to load trip for booking draft", loadError);
          setError("We couldn't load this trip. Please return to chat and try again.");
        });
    }
    setLoading(false);
  }, [params.draftId, profile?.email, profile?.name]);

  if (loading) {
    return <div className="p-8 text-center text-ink-500">Loading booking details...</div>;
  }
  if (!draft) {
    return (
      <main className="min-h-screen bg-cream-50 p-6">
        <PageHeader title="Booking details unavailable" />
        <Card className="mx-auto mt-8 max-w-lg space-y-4 p-6 text-center">
          <p className="text-ink-700">
            This booking link is missing or has expired. Please return to chat and select the option again.
          </p>
          <Button onClick={() => router.push("/chat")}>Return to chat</Button>
        </Card>
      </main>
    );
  }

  const isHotel = draft.type === "hotel";
  const itemName = text(draft.item.name, isHotel ? "Hotel" : "Transport option");
  const provider = text(draft.item.provider, text(draft.item.operator, "Provider"));
  const unitPrice = numeric(isHotel ? draft.item.pricePerNight : draft.item.price);
  const durationMinutes = numeric(draft.item.durationMinutes);
  const duration = durationMinutes > 0
    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
    : "—";
  const hotelNights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const totalPrice = isHotel ? unitPrice * hotelNights * rooms : unitPrice * passengers;

  const confirmBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const tripRepo = new IndexedDbTripRepository();
      const trip = await tripRepo.get(draft.details.tripId);
      if (!trip) throw new Error("The selected trip could not be found.");

      const bookingType = isHotel
        ? "hotel"
        : ["flight", "train", "bus"].includes(text(draft.item.mode).toLowerCase())
          ? text(draft.item.mode).toLowerCase()
          : "flight";
      const itemId = text(draft.item.id, draft.id);
      const details = isHotel
        ? {
            itemName,
            bookingType: draft.type,
            itemSnapshot: draft.item,
            checkIn,
            checkOut,
            guests,
            rooms,
            guestName,
            contact: { email: contactEmail, phone: contactPhone },
            specialRequests: requests,
          }
        : {
            itemName,
            bookingType: draft.type,
            itemSnapshot: draft.item,
            operator: provider,
            origin: text(draft.item.departureCity),
            destination: text(draft.item.arrivalCity),
            departureTime: text(draft.item.departureTime),
            arrivalTime: text(draft.item.arrivalTime),
            travelDate: draft.details.date || "",
            passengerCount: passengers,
            passengerName: guestName,
            contact: { email: contactEmail, phone: contactPhone },
            specialRequests: requests,
          };
      const result = await new BookingService().bookItem({
        tripId: trip.id,
        itemId,
        itemType: bookingType as "hotel" | "flight" | "train" | "bus",
        price: totalPrice,
        details,
      });
      const booking: Booking = {
        ...result,
        type: draft.type,
        itemSnapshot: draft.item,
        dates: isHotel ? { checkIn, checkOut } : { travelDate: draft.details.date || "" },
        travelers: isHotel ? guests : passengers,
        userId: profile?.id || "default_user",
      };
      const updatedTrip = {
        ...trip,
        bookings: [...(trip.bookings || []), booking],
      };
      await tripRepo.upsert(updatedTrip);
      window.dispatchEvent(new CustomEvent("trip-updated", { detail: { trip: updatedTrip } }));
      try {
        await fetch("/api/trips/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trip: updatedTrip }),
        });
      } catch (syncError) {
        console.warn("[booking] server sync failed; the local booking is saved", syncError);
      }
      if (result.status === "confirmed") {
        updateBookingDraft({ ...draft, status: "confirmed" });
        setConfirmation(booking.id);
      } else {
        setError(result.message);
      }
    } catch (confirmError: unknown) {
      console.error("[booking] confirmation failed", confirmError);
      setError(confirmError instanceof Error ? confirmError.message : "Booking could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (confirmation || draft.status === "confirmed") {
    return (
      <main className="min-h-screen bg-cream-50 p-6">
        <PageHeader title="Booking confirmed" />
        <Card className="mx-auto mt-8 max-w-lg space-y-4 p-6 text-center">
          <h2 className="text-xl font-bold text-sage-700">Your {draft.type} booking is confirmed</h2>
          <p className="text-ink-600">{itemName}</p>
          {confirmation && <p className="font-mono text-sm">Booking ID: {confirmation}</p>}
          <Button onClick={() => router.push(`/trip/${draft.details.tripId}?tab=bookings`)}>
            View bookings
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 p-4">
      <PageHeader title={isHotel ? "Hotel booking" : "Transport booking"} />
      <form onSubmit={confirmBooking} className="mx-auto max-w-lg space-y-4 pb-8">
        <Card className="space-y-2 p-4">
          <div className="flex justify-between gap-4">
            <h2 className="font-bold text-ink-900">{itemName}</h2>
            <span className="font-bold text-sage-700">
              ₹{unitPrice.toLocaleString()}{isHotel ? " / night" : " / person"}
            </span>
          </div>
          <div className="text-sm text-ink-600">
            {isHotel ? (
              <p>{text(draft.item.location)}</p>
            ) : (
              <>
                <p>{text(draft.item.mode).toUpperCase()} · {provider}</p>
                <p>{text(draft.item.departureCity)} → {text(draft.item.arrivalCity)}</p>
                <p>{text(draft.item.departureTime)} → {text(draft.item.arrivalTime)}</p>
                <p>Duration: {duration}</p>
                <p>Date: {text(draft.details.date)}</p>
              </>
            )}
          </div>
          <p className="text-sm text-ink-500">Trip: {tripName || "Loading trip..."}</p>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-bold text-ink-900">{isHotel ? "Hotel details" : "Passenger details"}</h2>
          {isHotel ? (
            <>
              <label className="block text-sm">Check-in date
                <input required type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
              </label>
              <label className="block text-sm">Check-out date
                <input required type="date" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Guests
                  <input required min={1} type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
                </label>
                <label className="block text-sm">Rooms
                  <input required min={1} type="number" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
                </label>
              </div>
            </>
          ) : (
            <label className="block text-sm">Passengers
              <input required min={1} type="number" value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
            </label>
          )}
          <label className="block text-sm">{isHotel ? "Guest name" : "Passenger name"}
            <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
          </label>
          <label className="block text-sm">Contact email
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
          </label>
          <label className="block text-sm">Contact phone
            <input required type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
          </label>
          <label className="block text-sm">{isHotel ? "Special requests" : "Special requests"}
            <textarea value={requests} onChange={(e) => setRequests(e.target.value)} className="mt-1 w-full rounded-lg border border-cream-200 bg-white p-2" />
          </label>
        </Card>

        <Card className="flex justify-between p-4">
          <span className="font-medium">{isHotel ? `Total (${hotelNights} nights, ${rooms} rooms)` : `Total (${passengers} passengers)`}</span>
          <span className="font-bold text-sage-700">₹{totalPrice.toLocaleString()}</span>
        </Card>
        {error && <p role="alert" className="text-sm text-coral-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={saving || totalPrice <= 0}>
          {saving ? "Booking..." : "Confirm and book"}
        </Button>
        <Link href="/chat" className="block text-center text-sm text-sage-700">Back to chat</Link>
      </form>
    </main>
  );
}

export default BookingDraftPage;
