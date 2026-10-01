"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Mic, MapPin, Compass, ArrowLeft } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { MessageRenderer } from "@/components/chat/MessageRenderer";
import { Avatar } from "@/components/ui/Avatar";
import { Message } from "@/lib/types";

// Quick prompt chips shown at the start of a guide session
const QUICK_PROMPTS = [
  { label: "What is this place?", icon: "🗺️" },
  { label: "How long should I spend here?", icon: "⏱️" },
  { label: "What should I see nearby?", icon: "📍" },
  { label: "What should I visit next?", icon: "➡️" },
  { label: "What's the weather like?", icon: "☀️" },
  { label: "Where should I eat nearby?", icon: "🍽️" },
];

// Simple in-memory message type for the guide (not persisted in IndexedDB)
interface GuideMessage {
  id: string;
  tripId?: string;
  role: "user" | "assistant";
  type: "text" | "attraction" | "restaurant" | "weather";
  content?: string;
  // artifact payloads
  attractions?: any[];
  restaurants?: any[];
  forecast?: any;
  createdAt: number;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function GuideChatBubble({ msg, tripId }: { msg: GuideMessage; tripId?: string }) {
  const isUser = msg.role === "user";
  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Map GuideMessage to Message shape for MessageRenderer
  const asMessage = (() => {
    const base = {
      id: msg.id,
      tripId: msg.tripId || tripId || "__guide__",
      role: msg.role,
      createdAt: msg.createdAt,
    };
    if (msg.type === "attraction" && msg.attractions) {
      return { ...base, type: "attraction" as const, attractions: msg.attractions };
    }
    if (msg.type === "restaurant" && msg.restaurants) {
      return { ...base, type: "restaurant" as const, restaurants: msg.restaurants };
    }
    if (msg.type === "weather" && msg.forecast) {
      return { ...base, type: "weather" as const, forecast: msg.forecast };
    }
    return { ...base, type: "text" as const, content: msg.content || "" };
  })();

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-5`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} gap-3`}>
        {!isUser && (
          <div className="shrink-0 mt-1">
            <Avatar size="sm" fallback="VG" />
          </div>
        )}
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`rounded-card px-5 py-4 ${
              isUser
                ? "bg-sage-600 text-white rounded-tr-none"
                : "bg-cream-100  text-ink-900 shadow-soft rounded-tl-none border border-cream-200"
            }`}
          >
            <MessageRenderer message={asMessage as Message} />
          </div>
          <span className="text-[10px] text-ink-500 mt-2 px-1">
            {isUser ? "You" : "Voyage Ranger"} &middot; {timeString}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start mb-5">
      <div className="flex gap-3">
        <Avatar size="sm" fallback="VG" />
        <div className="bg-cream-100  rounded-card rounded-tl-none px-5 py-4 border border-cream-200 shadow-soft">
          <div className="flex gap-1.5 items-center h-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-sage-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const destination = searchParams?.get("destination") || "";
  const attraction = searchParams?.get("attraction") || "";
  const tripId = searchParams?.get("tripId") || "";
  const dayParam = searchParams?.get("day");
  const day = dayParam ? parseInt(dayParam, 10) : undefined;

  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSendingRef = useRef(false);

  const [tripData, setTripData] = useState<any>(null);
  
  // Load trip data from IndexedDB
  useEffect(() => {
    if (tripId) {
      import('@/lib/repositories/indexeddb/IndexedDbTripRepository').then(({ IndexedDbTripRepository }) => {
        const repo = new IndexedDbTripRepository();
        repo.get(tripId).then(data => {
          if (data) setTripData(data);
        }).catch(console.error);
      });
    }
  }, [tripId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Set up speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setInputText((t) => (t + " " + final).trim());
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // History of plain text messages for the API
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || isSendingRef.current || !destination) return;
      isSendingRef.current = true;
      setInputText("");

      const userMsg: GuideMessage = {
        id: generateId(),
        role: "user",
        type: "text",
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      let currentTripData = tripData;
      if (tripId && !currentTripData) {
        try {
          const { IndexedDbTripRepository } = await import('@/lib/repositories/indexeddb/IndexedDbTripRepository');
          const repo = new IndexedDbTripRepository();
          const loaded = await repo.get(tripId);
          if (loaded) {
            currentTripData = loaded;
            setTripData(loaded);
          }
        } catch (e) {
          console.error("Failed to load trip data on demand", e);
        }
      }

      try {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            destination,
            attraction: attraction || undefined,
            tripId: tripId || undefined,
            day: day,
            history: historyRef.current,
            trip: currentTripData,
          }),
        });

        const data = await res.json();

        if (data.error) {
          const errMsg: GuideMessage = {
            id: generateId(),
            role: "assistant",
            type: "text",
            content: `Sorry, something went wrong: ${data.error}`,
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, errMsg]);
        } else {
          // Add text response
          const assistantMsg: GuideMessage = {
            id: generateId(),
            role: "assistant",
            type: "text",
            content: data.assistantMessage || "Here is what I found.",
            createdAt: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Add artifact messages
          if (data.artifacts) {
            const addedAttractions = new Set();
            const addedRestaurants = new Set();

            for (const artifact of data.artifacts) {
              if (artifact.type === "attraction" && artifact.attractions) {
                const newAttractions = artifact.attractions.filter((a: any) => !addedAttractions.has(a.id));
                newAttractions.forEach((a: any) => addedAttractions.add(a.id));
                
                if (newAttractions.length > 0) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: generateId(),
                      tripId: tripId || undefined,
                      role: "assistant",
                      type: "attraction",
                      attractions: newAttractions,
                      createdAt: Date.now(),
                    },
                  ]);
                }
              } else if (artifact.type === "restaurant" && artifact.restaurants) {
                const newRestaurants = artifact.restaurants.filter((r: any) => !addedRestaurants.has(r.id));
                newRestaurants.forEach((r: any) => addedRestaurants.add(r.id));
                
                if (newRestaurants.length > 0) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: generateId(),
                      tripId: tripId || undefined,
                      role: "assistant",
                      type: "restaurant",
                      restaurants: newRestaurants,
                      createdAt: Date.now(),
                    },
                  ]);
                }
              }
            }
          }

          // Update history for context
          historyRef.current = [
            ...historyRef.current,
            { role: "user" as const, content: trimmed },
            { role: "assistant" as const, content: data.assistantMessage || "" },
          ].slice(-20);
        }
      } catch (err: any) {
        const errMsg: GuideMessage = {
          id: generateId(),
          role: "assistant",
          type: "text",
          content: "Couldn't reach the guide. Check your connection.",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setLoading(false);
        isSendingRef.current = false;
      }
    },
    [destination, attraction, tripId, day, loading, tripData]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const hasContext = destination || attraction;
  const contextLabel = attraction
    ? `${attraction.replace(/-/g, " ")} · ${destination}`
    : destination;

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-2rem)] md:mt-4 md:rounded-cardLg md:border border-cream-200 bg-cream-50  overflow-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-cream-50/90  backdrop-blur-md border-b border-cream-200">
        <IconButton
          icon={<ArrowLeft size={20} />}
          variant="ghost"
          onClick={() => router.back()}
          aria-label="Go back"
          className="shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧭</span>
            <h1 className="font-display font-bold text-ink-900  text-base truncate">
              Voyage Ranger
            </h1>
          </div>
          {hasContext && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-sage-600 shrink-0" />
              <span className="text-xs text-ink-500 truncate capitalize">{contextLabel}</span>
              {day !== undefined && (
                <span className="ml-1 text-[10px] bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-pill font-semibold">
                  Day {day}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Context badge on the right */}
        {destination && (
          <div className="shrink-0 flex items-center gap-1.5 bg-sage-50  border border-sage-200  px-3 py-1.5 rounded-pill">
            <Compass size={13} className="text-sage-600" />
            <span className="text-xs font-semibold text-sage-800  truncate max-w-[100px]">
              {destination}
            </span>
          </div>
        )}
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
        {/* Empty state with quick prompts */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
            <div className="text-center">
              <div className="text-5xl mb-3">🧭</div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-1">
                {attraction
                  ? `Exploring ${attraction.replace(/-/g, " ")}`
                  : `Exploring ${destination || "your destination"}`}
              </h2>
              <p className="text-sm text-ink-500 max-w-xs mx-auto">
                Ask me anything about this place — history, best times, what's nearby, or where to eat.
              </p>
            </div>

            {/* Quick prompts grid */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.label)}
                  disabled={loading || !destination}
                  className="flex items-center gap-2 text-left px-3 py-3 rounded-card bg-cream-100  border border-cream-200 hover:border-sage-300 hover:bg-sage-50  transition-colors text-sm text-ink-700 font-medium shadow-soft disabled:opacity-40"
                >
                  <span className="text-base shrink-0">{qp.icon}</span>
                  <span className="text-xs leading-snug">{qp.label}</span>
                </button>
              ))}
            </div>

            {!destination && (
              <p className="text-xs text-coral-500 text-center">
                No destination in context. Open this page from a destination or attraction.
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <GuideChatBubble key={msg.id} msg={msg} tripId={tripId || undefined} />
        ))}

        {loading && <LoadingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts bar (after first message) */}
      {messages.length > 0 && !loading && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-2">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => sendMessage(qp.label)}
              disabled={loading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-cream-100  border border-cream-200 hover:border-sage-300 transition-colors text-xs text-ink-700 font-medium whitespace-nowrap"
            >
              <span>{qp.icon}</span>
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 z-10 w-full bg-cream-100  p-4 pb-safe-bottom border-t border-cream-200">
        <div className="max-w-4xl mx-auto flex items-center gap-2 bg-cream-50  rounded-pill p-2 shadow-sm border border-transparent focus-within:border-sage-400 focus-within:ring-2 focus-within:ring-sage-200 transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !destination}
            placeholder={
              !destination
                ? "No destination context"
                : loading
                ? "Thinking..."
                : "Ask the guide anything..."
            }
            className="flex-1 bg-transparent border-none focus:outline-none text-ink-900 placeholder-ink-500 py-2 px-1 disabled:cursor-not-allowed text-sm"
          />

          {inputText.trim() ? (
            <IconButton
              icon={<Send size={18} className="ml-0.5" />}
              variant="coral"
              onClick={() => sendMessage(inputText)}
              type="button"
              aria-label="Send"
              disabled={loading || !destination}
            />
          ) : (
            <IconButton
              icon={<Mic size={20} />}
              variant="ghost"
              type="button"
              aria-label="Voice input"
              onClick={toggleMic}
              disabled={loading || !destination}
              className={isListening ? "text-coral-500 bg-coral-50" : ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-ink-500">
          Loading guide...
        </div>
      }
    >
      <GuidePageContent />
    </Suspense>
  );
}
