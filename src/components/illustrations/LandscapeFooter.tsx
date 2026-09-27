import React from "react";

export type LandscapeScene = "mountain" | "beach" | "heritage" | "lake" | "default";

export function LandscapeFooter({ className = "", scene = "default" }: { className?: string, scene?: LandscapeScene }) {
  
  const renderMountainScene = () => (
    <>
      <rect width="375" height="260" fill="transparent" />
      <circle cx="280" cy="80" r="30" fill="var(--color-cream-200)" />
      
      <path d="M-50 200 L100 80 L250 200 Z" fill="var(--color-sky-200)" />
      <path d="M150 220 L280 100 L400 220 Z" fill="var(--color-sky-300)" />
      
      <path d="M-50 260 L80 160 L200 260 Z" fill="var(--color-sage-300)" />
      <path d="M120 260 L220 180 L350 260 Z" fill="var(--color-sage-400)" />
      
      <path d="M-20 230 Q180 200 400 240 L400 260 L-20 260 Z" fill="var(--color-sage-500)" />
      
      <path d="M40 220 L30 250 L50 250 Z" fill="var(--color-sage-700)" />
      <path d="M40 200 L32 230 L48 230 Z" fill="var(--color-sage-700)" />
      
      <path d="M80 230 L65 260 L95 260 Z" fill="var(--color-sage-800)" />
      <path d="M80 210 L68 240 L92 240 Z" fill="var(--color-sage-800)" />
      
      <path d="M280 240 L260 190 L300 240 Z" fill="var(--color-sage-700)" />
    </>
  );

  const renderBeachScene = () => (
    <>
      <rect width="375" height="260" fill="transparent" />
      <circle cx="187.5" cy="120" r="60" fill="var(--color-coral-100)" />
      
      <path d="M-20 180 Q180 170 400 180 L400 220 L-20 220 Z" fill="var(--color-sky-200)" />
      <path d="M-20 200 Q180 190 400 200" stroke="white" strokeWidth="2" fill="none" opacity="0.5" />
      
      <path d="M-20 220 Q180 200 400 220 L400 260 L-20 260 Z" fill="var(--color-cream-300)" />
      
      <path d="M40 240 Q45 200 50 160" stroke="var(--color-ink-500)" strokeWidth="4" fill="none" />
      <path d="M50 160 Q30 140 20 150 M50 160 Q30 160 25 175 M50 160 Q60 130 70 140 M50 160 Q70 160 75 170" stroke="var(--color-sage-600)" strokeWidth="3" fill="none" />
      
      <path d="M340 250 Q335 180 330 130" stroke="var(--color-ink-500)" strokeWidth="5" fill="none" />
      <path d="M330 130 Q300 100 280 120 M330 130 Q300 140 290 160 M330 130 Q360 90 380 110 M330 130 Q370 140 380 150" stroke="var(--color-sage-600)" strokeWidth="4" fill="none" />
    </>
  );

  const renderHeritageScene = () => (
    <>
      <rect width="375" height="260" fill="transparent" />
      <circle cx="100" cy="100" r="40" fill="var(--color-rose-100)" />
      
      <path d="M-20 240 Q180 200 400 240 L400 260 L-20 260 Z" fill="var(--color-rose-300)" />
      
      {/* Dome */}
      <path d="M120 180 Q187.5 80 250 180 Z" fill="var(--color-rose-400)" />
      <rect x="120" y="180" width="130" height="60" fill="var(--color-rose-400)" />
      {/* Pillars */}
      <rect x="130" y="180" width="10" height="60" fill="var(--color-rose-500)" />
      <rect x="170" y="180" width="10" height="60" fill="var(--color-rose-500)" />
      <rect x="210" y="180" width="10" height="60" fill="var(--color-rose-500)" />
      {/* Arch */}
      <path d="M140 200 Q155 170 170 200 Z" fill="var(--color-rose-500)" />
      
      <path d="M-20 250 Q180 230 400 250 L400 260 L-20 260 Z" fill="var(--color-rose-600)" />
    </>
  );

  const renderLakeScene = () => (
    <>
      <rect width="375" height="260" fill="transparent" />
      
      <path d="M-50 180 Q100 120 250 180 T500 180 L500 260 L-50 260 Z" fill="var(--color-teal-200)" />
      
      {/* Water */}
      <path d="M-20 200 Q180 190 400 200 L400 260 L-20 260 Z" fill="var(--color-sky-300)" />
      <path d="M20 210 Q60 215 100 210" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M220 220 Q260 225 300 220" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
      
      {/* Boat */}
      <path d="M120 230 L180 230 L170 240 L130 240 Z" fill="var(--color-amber-600)" />
      <path d="M150 210 L150 230" stroke="var(--color-ink-800)" strokeWidth="2" />
      <path d="M150 210 L170 220 L150 225 Z" fill="white" />
      
      {/* Foreground */}
      <path d="M-20 240 Q40 220 100 260 L-20 260 Z" fill="var(--color-teal-500)" />
      <path d="M250 260 Q320 220 400 240 L400 260 Z" fill="var(--color-teal-600)" />
      
      {/* Trees */}
      <path d="M320 230 L310 260 L330 260 Z" fill="var(--color-teal-800)" />
      <path d="M350 220 L330 260 L370 260 Z" fill="var(--color-teal-900)" />
    </>
  );

  const renderDefaultScene = () => (
    <>
      <rect width="375" height="260" fill="transparent" />
      <circle cx="187.5" cy="80" r="40" fill="var(--color-coral-100)" />
      <path d="M-20 180 Q40 100 120 160 T250 120 T400 180 L400 260 L-20 260 Z" fill="var(--color-sage-200)" />
      <path d="M260 160 Q280 120 300 160 L260 160 Z" fill="var(--color-sage-300)" />
      <rect x="250" y="160" width="60" height="20" fill="var(--color-sage-300)" />
      <path d="M-20 210 Q80 150 187.5 190 T400 200 L400 260 L-20 260 Z" fill="var(--color-sage-300)" />
      <path d="M187.5 210 Q280 180 400 220 L400 260 L187.5 260 Z" fill="var(--color-sky-100)" />
      <path d="M200 220 Q240 210 280 225 T360 215" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M-20 240 Q80 200 220 260 L-20 260 Z" fill="var(--color-sage-400)" />
      <path d="M40 230 L30 250 L50 250 Z" fill="var(--color-sage-600)" />
      <path d="M40 220 L32 240 L48 240 Z" fill="var(--color-sage-600)" />
      <path d="M80 225 L65 255 L95 255 Z" fill="var(--color-sage-700)" />
      <path d="M80 210 L68 240 L92 240 Z" fill="var(--color-sage-700)" />
      <path d="M320 240 Q325 210 330 180" stroke="var(--color-ink-500)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M330 180 Q310 160 300 170 M330 180 Q310 180 305 195 M330 180 Q340 150 350 160 M330 180 Q350 180 355 190 M330 180 Q330 150 325 150" stroke="var(--color-sage-600)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M140 240 L160 200 L180 240 Z" fill="var(--color-coral-400)" />
      <path d="M160 200 L180 240 L210 230 L185 195 Z" fill="var(--color-coral-500)" />
      <path d="M160 215 L150 240 L170 240 Z" fill="var(--color-ink-700)" />
      <circle cx="100" cy="245" r="2" fill="white" />
      <circle cx="110" cy="250" r="1.5" fill="var(--color-coral-300)" />
      <circle cx="95" cy="252" r="2" fill="white" />
    </>
  );

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 375 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMax slice"
      >
        {scene === "mountain" && renderMountainScene()}
        {scene === "beach" && renderBeachScene()}
        {scene === "heritage" && renderHeritageScene()}
        {scene === "lake" && renderLakeScene()}
        {scene === "default" && renderDefaultScene()}
      </svg>
    </div>
  );
}
