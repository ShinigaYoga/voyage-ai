import React from "react";
import { Message } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { MessageRenderer } from "./MessageRenderer";

export function MessageBubble({
  message,
  onReplan,
}: {
  message: Message;
  onReplan?: () => void;
}) {
  const isUser = message.role === "user";

  const timeString = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const senderName = isUser ? "You" : "Voyage Ranger";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} gap-3`}>
        {!isUser && (
          <div className="shrink-0 mt-1">
            <Avatar size="sm" fallback="VR" />
          </div>
        )}

        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`
              rounded-card px-5 py-4
              ${isUser
                ? "bg-sage-600 text-white rounded-tr-none"
                : "bg-cream-100  text-ink-900 shadow-soft rounded-tl-none border border-cream-200"
              }
            `}
          >
            <MessageRenderer message={message} onReplan={onReplan} />
          </div>

          <span className="text-[10px] text-ink-500 mt-2 px-1">
            {senderName} &middot; {timeString}
          </span>
        </div>
      </div>
    </div>
  );
}
