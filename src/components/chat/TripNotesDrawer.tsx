import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

interface TripNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tripName?: string;
  initialNotes?: string;
  onSave: (notes: string) => void;
}

export function TripNotesDrawer({ isOpen, onClose, tripName, initialNotes = "", onSave }: TripNotesDrawerProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Update state if parent passes new initialNotes when opening
  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes);
    }
  }, [isOpen, initialNotes]);

  // Auto-save debounce
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (notes !== initialNotes) {
        onSave(notes);
        setLastSaved(new Date());
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [notes, initialNotes, isOpen, onSave]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-cream-50 border-l border-cream-200 z-50 shadow-float flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-cream-200">
          <h2 className="font-display font-bold text-ink-900">Trip Notes</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cream-100 text-ink-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {!tripName ? (
          <div className="p-6 text-center text-ink-500">
            Select or create a trip to take notes.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-sage-50 border-b border-sage-100">
              <span className="text-xs font-semibold text-sage-700 uppercase tracking-wider">{tripName}</span>
            </div>
            
            <textarea
              className="flex-1 w-full bg-transparent resize-none outline-none p-4 text-ink-700 leading-relaxed placeholder-ink-400"
              placeholder="Jot down packing lists, ideas, or reminders here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== initialNotes) {
                  onSave(notes);
                  setLastSaved(new Date());
                }
              }}
            />
            
            <div className="p-3 border-t border-cream-200 text-xs text-ink-400 text-right">
              {lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to save'}
            </div>
          </>
        )}
      </div>
    </>
  );
}
