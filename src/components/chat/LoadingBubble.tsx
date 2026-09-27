import React from "react";
import { Avatar } from "../ui/Avatar";

export function LoadingBubble({ status = "Understanding your trip..." }: { status?: string }) {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[90%] md:max-w-[80%] flex-row gap-3">
        <div className="shrink-0 mt-1">
          <Avatar size="sm" fallback="VR" />
        </div>

        <div className="flex flex-col items-start">
          <div className="bg-cream-50 text-ink-900 shadow-soft rounded-card rounded-tl-none px-5 py-4 flex items-center gap-3">
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-sage-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-sage-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-sage-500 rounded-full animate-bounce" />
            </div>
            <span className="text-xs text-ink-600 font-medium">{status}</span>
          </div>

          <span className="text-[10px] text-ink-500 mt-2 px-1">
            Voyage Ranger &middot; Thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
