"use client";

import React, { useState } from "react";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** When true, show a subtle "Illustrative" badge on hover */
  illustrative?: boolean;
  /** Inline style */
  style?: React.CSSProperties;
}

/**
 * Image component with graceful error fallback.
 * Shows a styled SVG placeholder when image fails to load.
 * When illustrative=true, shows a translucent badge on hover to indicate
 * the image is not an actual photograph of the place.
 */
export function ImageWithFallback({
  src,
  alt,
  className = "",
  illustrative = false,
  style,
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-cream-100  ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <svg
          className="w-10 h-10 text-cream-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setErrored(true)}
      />
      {illustrative && (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            Illustrative
          </span>
        </div>
      )}
    </div>
  );
}
