import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Send, X, File as FileIcon, Image as ImageIcon } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { useToast } from "@/lib/hooks/useToast";

interface Attachment {
  url: string;
  name: string;
  type: string;
}

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  initialValue?: string;
}

export function ChatInput({ onSend, disabled = false, initialValue = "" }: ChatInputProps) {
  const [text, setText] = useState(initialValue);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  
  // Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  // Captures the text in the composer at the moment mic is clicked, so we can
  // always do a replace (base + final + interim) instead of an append.
  const voiceStartTextRef = useRef<string>("");

  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    // One utterance at a time — stops automatically after silence.
    // This prevents the per-word continuous-mode duplication bug.
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      // Always REPLACE, never append. voiceStartTextRef is the text that
      // was in the composer when the mic was clicked.
      const base = voiceStartTextRef.current;
      const combined = (base + (base ? " " : "") + finalTranscript + interimTranscript).trimEnd();
      setText(combined);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        showToast("Microphone access denied. Enable it in your browser settings.");
      }
      setIsListening(false);
    };

    // onend fires when the utterance ends naturally. We just update state —
    // the text is already correct from onresult.
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [showToast]);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isUploading) return;
    
    // Clear local state BEFORE calling onSend so the UI empties immediately
    setText("");
    const currentAttachments = [...attachments];
    setAttachments([]);
    
    onSend(trimmed, currentAttachments.length > 0 ? currentAttachments : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large. Max 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }
      
      const data = await res.json();
      setAttachments(prev => [...prev, { url: data.url, name: data.name, type: data.type }]);
    } catch (err: any) {
      showToast(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      showToast("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Snapshot the current composer text so onresult can do a replace.
        voiceStartTextRef.current = text;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
        showToast("Could not start microphone.");
      }
    }
  };

  return (
    <div className="bg-cream-100 p-4 pb-safe-bottom relative">
      {isListening && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-coral-600 animate-pulse bg-cream-50 px-3 py-1 rounded-full shadow-sm">
          Listening...
        </div>
      )}
      
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        {/* Attachments Preview Area */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white  border border-cream-200 rounded-lg p-1.5 pr-2 shadow-sm relative group max-w-[200px]">
                <div className="w-8 h-8 rounded bg-cream-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {att.type.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon size={16} className="text-ink-400" />
                  )}
                </div>
                <div className="text-xs text-ink-700 truncate font-medium flex-1">
                  {att.name}
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-cream-50 rounded-pill p-2 shadow-sm border border-transparent focus-within:border-sage-400 focus-within:ring-2 focus-within:ring-sage-200 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
          />
          <IconButton
            icon={<Paperclip size={20} />}
            variant="ghost"
            type="button"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          />

          <input
            ref={inputRef}
            type="text"
            value={text}
            disabled={disabled || isUploading}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Uploading..." : disabled ? "Thinking..." : "Where to next?"}
            className="flex-1 bg-transparent border-none focus:outline-none text-ink-900 placeholder-ink-500 py-2 px-1 disabled:cursor-not-allowed"
          />

          {text.trim() || attachments.length > 0 ? (
            <IconButton
              icon={<Send size={18} className="ml-0.5" />}
              variant="coral"
              onClick={handleSend}
              type="button"
              aria-label="Send message"
              disabled={disabled || isUploading}
            />
          ) : (
            <IconButton
              icon={<Mic size={20} />}
              variant="ghost"
              type="button"
              aria-label="Voice input"
              onClick={toggleMic}
              disabled={disabled || isUploading}
              className={isListening ? "text-coral-500 bg-coral-50" : ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
