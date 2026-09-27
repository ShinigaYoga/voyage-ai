"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Image as ImageIcon } from "lucide-react";

export interface RemoteImageProps extends Omit<ImageProps, "onError"> {
  fallbackIcon?: React.ReactNode;
}

export function RemoteImage({
  className = "",
  fallbackIcon = <ImageIcon className="text-sage-300" size={32} />,
  ...props
}: RemoteImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className={`relative flex items-center justify-center bg-cream-200 rounded-[var(--radius-card)] ${className}`}>
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-sage-100 animate-pulse z-10" />
      )}
      <Image
        {...props}
        className={`object-cover transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`}
        onError={() => setError(true)}
        onLoadingComplete={() => setLoading(false)}
      />
    </div>
  );
}
