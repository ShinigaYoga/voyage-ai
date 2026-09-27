import React from "react";

export function EmptyStateIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background blob */}
        <path d="M60 110C87.6142 110 110 87.6142 110 60C110 32.3858 87.6142 10 60 10C32.3858 10 10 32.3858 10 60C10 87.6142 32.3858 110 60 110Z" fill="var(--color-sage-100)" />
        
        {/* Map */}
        <rect x="25" y="35" width="70" height="50" rx="4" fill="white" stroke="var(--color-ink-500)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M45 35V85" stroke="var(--color-ink-500)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 4" />
        <path d="M75 35V85" stroke="var(--color-ink-500)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 4" />
        <circle cx="55" cy="55" r="4" fill="var(--color-coral-400)" />
        <circle cx="85" cy="70" r="4" fill="var(--color-sage-500)" />
        <path d="M55 55L85 70" stroke="var(--color-ink-500)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" />

        {/* Compass */}
        <circle cx="85" cy="30" r="16" fill="white" stroke="var(--color-sage-600)" strokeWidth="2" />
        <circle cx="85" cy="30" r="12" fill="var(--color-cream-100)" />
        <path d="M85 20L89 30L85 40L81 30L85 20Z" fill="var(--color-coral-500)" />
        <path d="M85 30L89 30L85 40L81 30L85 30Z" fill="var(--color-ink-500)" />

        {/* Tiny pine tree */}
        <path d="M35 80L30 90H40L35 80Z" fill="var(--color-sage-600)" />
        <path d="M35 75L32 85H38L35 75Z" fill="var(--color-sage-600)" />
        <rect x="34" y="90" width="2" height="4" fill="var(--color-ink-700)" />
      </svg>
    </div>
  );
}
