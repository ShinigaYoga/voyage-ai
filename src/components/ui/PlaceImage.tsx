import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PlaceImageProps {
  src?: string;
  alt?: string;
  source?: string;
  attribution?: string;
  className?: string;
  type?: 'hotel' | 'attraction';
  /** If true and src is missing, renders nothing (no empty tile). For food places. */
  hideIfMissing?: boolean;
}

export function PlaceImage({
  src,
  alt,
  source,
  attribution,
  className = '',
  type = 'attraction',
  hideIfMissing = false,
}: PlaceImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const hasValidImage = src && !error;

  if (!hasValidImage && hideIfMissing) return null;

  const creditLabel = attribution || source;

  return (
    <div className={`relative overflow-hidden bg-cream-100 flex items-center justify-center ${className}`}>
      {hasValidImage ? (
        <>
          <img
            src={src}
            alt={alt || "Place image"}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-cream-200 animate-pulse" />
          )}
          {creditLabel && loaded && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[8px] rounded backdrop-blur-sm shadow-sm opacity-80 max-w-[90%] truncate">
              {attribution ? attribution : `Photo: ${source}`}
            </div>
          )}
        </>
      ) : (
        <div
          className="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 flex flex-col items-center justify-center text-ink-300"
          aria-hidden="true"
        >
          <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
          <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">
            {type === 'hotel' ? 'Hotel' : 'Attraction'}
          </span>
        </div>
      )}
    </div>
  );
}
