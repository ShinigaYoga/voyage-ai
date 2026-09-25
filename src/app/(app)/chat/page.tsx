"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { TripSelector } from "@/components/chat/TripSelector";
import { TripNotesDrawer } from "@/components/chat/TripNotesDrawer";
import { MessageFilterPopover, ALL_FILTER_TYPES } from "@/components/chat/MessageFilterPopover";
import { IconButton } from "@/components/ui/IconButton";
import { BookOpen, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { IndexedDbTripRepository } from "@/lib/repositories/indexeddb/IndexedDbTripRepository";
import { IndexedDbMessageRepository } from "@/lib/repositories/indexeddb/IndexedDbMessageRepository";
import { Trip, Message, MessageType } from "@/lib/types";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTripId = searchParams?.get("tripId");
  const queryPrompt = searchParams?.get("prompt") || "";

  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Understanding your trip...");
  const [initialized, setInitialized] = useState(false);

  // Drawer & Popover state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<MessageType[]>(ALL_FILTER_TYPES);

  // Use a ref as the sending lock — immune to React StrictMode double-invocation
  const isSendingRef = useRef(false);

  // Stable repo instances (avoid recreating on every render)
  const tripRepo = useRef(new IndexedDbTripRepository()).current;
  const msgRepo = useRef(new IndexedDbMessageRepository()).current;

  // Load trips on mount — NEVER auto-create a trip; let the user do it via chat
  useEffect(() => {
    console.log("[ChatPage] mount effect starting");
    let cancelled = false;

    async function loadTrips() {
      try {
        const data = await tripRepo.list();
        let activeTrip: Trip | undefined = undefined;

        if (queryTripId) {
          activeTrip = data.find(t => t.id === queryTripId);
        }

        if (!activeTrip && data.length > 0) {
          activeTrip = data[0];
        }

        if (!cancelled) {
          setTrips(data);
          if (activeTrip) {
            setCurrentTrip(activeTrip);
            console.log("[ChatPage] mount effect done — loaded trip:", activeTrip.id);

            // Background sync with server (fire-and-forget)
            fetch(`/api/trips/${activeTrip.id}`).then(async res => {
              if (res.ok) {
                const serverData = await res.json();
                if (serverData.trip && !cancelled) {
                  await tripRepo.upsert(serverData.trip);
                  setCurrentTrip(serverData.trip);
                }
              } else if (res.status === 404 && activeTrip) {
                // Push local trip to server
                fetch("/api/trips/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ trip: activeTrip }),
                }).catch(() => {});
              }
            }).catch(() => {});
          } else {
            console.log("[ChatPage] mount effect done — no trips yet");
          }
          setInitialized(true);
        }
      } catch (e) {
        console.error("[ChatPage] mount effect threw:", e);
        if (!cancelled) setInitialized(true);
      }
    }
    loadTrips();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages & filters when current trip changes
  useEffect(() => {
    async function loadMessages() {
      if (currentTrip) {
        const data = await msgRepo.listByTrip(currentTrip.id);
        setMessages(data);

        const savedFilters = localStorage.getItem(`chat_filters_${currentTrip.id}`);
        if (savedFilters) {
          try {
            setActiveFilters(JSON.parse(savedFilters));
          } catch(e) {}
        } else {
          setActiveFilters(ALL_FILTER_TYPES);
        }
      } else {
        setMessages([]);
      }
    }
    loadMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id]);

  const handleSend = useCallback(async (rawText: string, attachments?: { url: string; name: string; type: string }[]) => {
    const text = rawText.trim();

    // Guard 1: empty text/no attachments
    if (!text && (!attachments || attachments.length === 0)) return;

    // Guard 2: re-entry lock (ref-based, StrictMode-safe)
    if (isSendingRef.current) return;
    isSendingRef.current = true;

    setLoading(true);
    setLoadingStatus("Understanding your trip...");

    // Resolve active trip — if none exists yet, messages go to a "pending" state
    // that will be resolved once the AI creates one
    const activeTripId = currentTrip?.id;

    // 1. Persist user message ONCE — use a temp tripId if no trip yet
    // We'll use a special "pending" key that gets migrated when the trip is created
    const tripIdForMsg = activeTripId || "__pending__";

    let userMsg: Message;
    try {
      userMsg = await msgRepo.create({
        tripId: tripIdForMsg,
        role: "user" as const,
        type: "text" as const,
        content: text,
        ...(attachments && attachments.length > 0 ? { attachments } : {})
      });
    } catch (dbErr) {
      console.error("[ChatPage] Failed to persist user message", dbErr);
      isSendingRef.current = false;
      setLoading(false);
      return;
    }

    // 2. Append user message to UI
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: activeTripId,
          message: text,
          attachments: attachments,
          // Send history snapshot (does NOT include the new userMsg — server adds it)
          history: messages,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        const errText = data.error.includes("429")
          ? "AI is busy, try again in a moment."
          : `AI Error: ${data.error}`;
        const errMsg = await msgRepo.create({
          tripId: tripIdForMsg,
          role: "assistant" as const,
          type: "text" as const,
          content: errText,
        });
        setMessages((prev) => [...prev, errMsg]);
      } else {
        // Handle trip state updates from agent
        let activeTrip = currentTrip;
        let resolvedTripId = tripIdForMsg;

        if (data.trip) {
          // A trip was created or updated — upsert locally and sync to server
          await tripRepo.upsert(data.trip);
          activeTrip = data.trip;
          resolvedTripId = data.trip.id;

          // If this is a NEW trip (user had no trip before), migrate pending messages
          if (!activeTripId && data.trip.id) {
            // Re-associate the user message with the real tripId
            // (The message is already in IndexedDB under __pending__, 
            //  but we create a fresh one under the real tripId)
            try {
              await msgRepo.create({
                tripId: data.trip.id,
                role: "user" as const,
                type: "text" as const,
                content: text,
                ...(attachments && attachments.length > 0 ? { attachments } : {})
              });
            } catch (e) {
              console.warn("[ChatPage] Could not migrate pending user message", e);
            }
          }

          setCurrentTrip(data.trip);
          const updatedList = await tripRepo.list();
          setTrips(updatedList);

          // Sync new/updated trip to server
          fetch("/api/trips/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip: data.trip }),
          }).catch(console.error);
        }

        // 3b. Append assistant text response
        const assistantText = data.assistantMessage || "Trip plan updated.";
        const assistantMsg = await msgRepo.create({
          tripId: resolvedTripId,
          role: "assistant" as const,
          type: "text" as const,
          content: assistantText,
        });
        setMessages((prev) => [...prev, assistantMsg]);

        // 3c. If artifacts returned, append structured messages
        if (data.artifacts) {
          for (const artifact of data.artifacts) {
            if (artifact.type === "trip" && artifact.trip) {
              const tripMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "trip" as const,
                trip: artifact.trip,
              });
              setMessages((prev) => [...prev, tripMsg]);
            } else if (artifact.type === "itinerary" && artifact.itinerary) {
              const itineraryMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "itinerary" as const,
                itinerary: artifact.itinerary,
                tripName: artifact.tripName,
              });
              setMessages((prev) => [...prev, itineraryMsg]);
            } else if (artifact.type === "tripUpdated") {
              const tripUpdatedMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "tripUpdated" as const,
                changes: artifact.changes || [],
                trip: artifact.trip,
              });
              setMessages((prev) => [...prev, tripUpdatedMsg]);
            } else if (artifact.type === "transport" && artifact.options) {
              const transportMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "transport" as const,
                options: artifact.options,
              } as any);
              setMessages((prev) => [...prev, transportMsg]);
            } else if (artifact.type === "hotel" && artifact.hotels) {
              const hotelMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "hotel" as const,
                hotels: artifact.hotels,
              } as any);
              setMessages((prev) => [...prev, hotelMsg]);
            } else if (artifact.type === "restaurant" && artifact.restaurants) {
              const restMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "restaurant" as const,
                restaurants: artifact.restaurants,
              } as any);
              setMessages((prev) => [...prev, restMsg]);
            } else if (artifact.type === "attraction" && artifact.attractions) {
              const attrMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "attraction" as const,
                attractions: artifact.attractions,
              } as any);
              setMessages((prev) => [...prev, attrMsg]);
            } else if (artifact.type === "booking" && artifact.booking) {
              const bookMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "booking" as const,
                booking: artifact.booking,
              } as any);
              setMessages((prev) => [...prev, bookMsg]);
            } else if (artifact.type === "weather") {
              const weatherMsg = await msgRepo.create({
                tripId: resolvedTripId,
                role: "assistant" as const,
                type: "weather" as const,
                destination: artifact.destination,
                forecasts: artifact.forecasts,
                summary: artifact.summary,
              } as any);
              setMessages((prev) => [...prev, weatherMsg]);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[ChatPage] Failed to reach agent API", err);
      const fallbackMsg = await msgRepo.create({
        tripId: tripIdForMsg,
        role: "assistant" as const,
        type: "text" as const,
        content: "Couldn't reach the AI. Check your connection.",
      });
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  // currentTrip and messages are captured at call time, which is correct
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip, messages]);

  const handleCreateNewTrip = async () => {
    const newTrip = await tripRepo.create({
      name: "New Adventure",
      destination: "Unknown",
      travelers: 1,
    });

    try {
      await fetch("/api/trips/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: newTrip }),
      });
    } catch (e) {
      console.error("Failed to sync new trip to server", e);
    }

    setTrips((prev) => [newTrip, ...prev]);
    setCurrentTrip(newTrip);
  };

  const handleSaveNotes = async (notes: string) => {
    if (!currentTrip) return;
    const updated = { ...currentTrip, notes };
    setCurrentTrip(updated);
    await tripRepo.upsert(updated);

    // Fire-and-forget sync
    fetch('/api/trips/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip: updated }),
    }).catch(console.error);
  };

  const handleFilterChange = (filters: MessageType[]) => {
    setActiveFilters(filters);
    if (currentTrip) {
      localStorage.setItem(`chat_filters_${currentTrip.id}`, JSON.stringify(filters));
    }
  };

  const hiddenCount = ALL_FILTER_TYPES.length - activeFilters.length;

  // Filter messages but ALWAYS show user messages and AI text responses
  const filteredMessages = messages.filter(m =>
    m.role === 'user' || m.type === 'text' || activeFilters.includes(m.type)
  );

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-2rem)] md:mt-4 md:rounded-cardLg md:border border-cream-200 bg-cream-50 dark:bg-[#141412] overflow-hidden relative">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-cream-50/90 dark:bg-[#141412]/90 backdrop-blur-md border-b border-cream-200">
        <div className="md:hidden">
          <IconButton icon={<ArrowLeft size={20} />} variant="ghost" onClick={() => router.back()} />
        </div>
        <div className="hidden md:block w-10"></div>

        <TripSelector
          trips={trips}
          currentTrip={currentTrip}
          onSelect={(id) => setCurrentTrip(trips.find((t) => t.id === id))}
          onCreateNew={handleCreateNewTrip}
        />

        <div className="flex items-center gap-1 relative">
          <IconButton
            icon={<BookOpen size={20} />}
            variant="ghost"
            onClick={() => setIsNotesOpen(true)}
            className={isNotesOpen ? "bg-sage-100 text-sage-800" : ""}
          />
          <IconButton
            icon={<SlidersHorizontal size={20} />}
            variant="ghost"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={isFilterOpen || hiddenCount > 0 ? "bg-sage-100 text-sage-800" : ""}
          />
          <MessageFilterPopover
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            activeFilters={activeFilters}
            onChange={handleFilterChange}
          />
        </div>
      </header>

      {hiddenCount > 0 && (
        <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-10">
          <div className="bg-sage-100 text-sage-800 text-xs font-semibold px-3 py-1 rounded-pill shadow-sm border border-sage-200 flex items-center gap-2">
            {hiddenCount} message type{hiddenCount > 1 ? 's' : ''} hidden
            <button
              onClick={() => handleFilterChange(ALL_FILTER_TYPES)}
              className="hover:text-sage-900 underline underline-offset-2 ml-1"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <TripNotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        tripName={currentTrip?.name}
        initialNotes={currentTrip?.notes}
        onSave={handleSaveNotes}
      />

      {/* Message List */}
      <MessageList
        messages={filteredMessages}
        onQuickPrompt={(text) => handleSend(text)}
        loading={loading}
        loadingStatus={loadingStatus}
        currentTrip={currentTrip}
        initialized={initialized}
      />

      {/* Input Area */}
      <div className="sticky bottom-0 z-10 w-full">
        <ChatInput onSend={handleSend} disabled={loading} initialValue={queryPrompt} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-ink-500">Loading chat...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
