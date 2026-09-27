import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { Activity } from '@/lib/types';
import { Map } from 'lucide-react';

const DynamicMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-75 bg-cream-100 dark:bg-ink-800 animate-pulse rounded-cardLg flex items-center justify-center text-ink-500">
      Loading Map...
    </div>
  )
});

interface TripMapProps {
  activities: Activity[];
  originCoords?: { lat: number; lon: number } | null;
  destination: string;
  activeActivityId?: string | null;
  onActivitySelect?: (id: string) => void;
}

export function TripMap(props: TripMapProps) {
  const [showLines, setShowLines] = useState(true);

  return (
    <div className="w-full h-full min-h-75 relative rounded-cardLg overflow-hidden border border-cream-200 shadow-sm z-0 group">
      <div className="absolute top-4 right-4 z-999">
        <button
          onClick={() => setShowLines(!showLines)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-md transition-colors ${
            showLines 
              ? 'bg-sage-600 text-white hover:bg-sage-700' 
              : 'bg-white text-ink-700 hover:bg-cream-100 border border-cream-200'
          }`}
        >
          <Map size={16} />
          {showLines ? 'Hide travel lines' : 'Show travel lines'}
        </button>
      </div>
      <DynamicMap {...props} showLines={showLines} />
    </div>
  );
}
