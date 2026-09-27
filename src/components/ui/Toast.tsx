import React from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 md:left-auto md:right-6 -translate-x-1/2 md:translate-x-0 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 bg-cream-50 px-4 py-3 rounded-card border-2 border-sage-200 shadow-float min-w-[280px] max-w-sm">
        <div className="flex-1 text-sm font-medium text-ink-900">{message}</div>
        <button
          onClick={onClose}
          className="text-ink-400 hover:text-ink-700 transition-colors p-1 rounded-md hover:bg-cream-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
