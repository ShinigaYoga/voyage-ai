import React, { useEffect, useRef } from "react";
import { Message, Trip } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatEmptyState } from "./ChatEmptyState";
import { LoadingBubble } from "./LoadingBubble";

interface MessageListProps {
  messages: Message[];
  onQuickPrompt?: (text: string) => void;
  loading?: boolean;
  loadingStatus?: string;
  currentTrip?: Trip;
  initialized?: boolean;
}

export function MessageList({ messages, onQuickPrompt, loading, loadingStatus, currentTrip, initialized }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // While initializing (loading trips from IndexedDB), show nothing to avoid flicker
  if (!initialized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-5 h-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col justify-center py-10">
        <ChatEmptyState onQuickPrompt={onQuickPrompt} currentTrip={currentTrip} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onReplan={msg.type === "weather" && onQuickPrompt ? () => onQuickPrompt("Yes, replan it.") : undefined}
        />
      ))}
      {loading && <LoadingBubble status={loadingStatus} />}
      <div ref={bottomRef} />
    </div>
  );
}
