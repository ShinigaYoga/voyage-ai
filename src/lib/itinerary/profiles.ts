export type DestinationCategory = 'beach' | 'mountain' | 'heritage' | 'backwater' | 'city';

export interface TimeSlot {
  label: 'morning' | 'midday' | 'afternoon' | 'evening';
  startTime: string;
  categoryHint: 'food' | 'culture' | 'nature' | 'nightlife' | 'rest' | 'shopping';
}

export interface DestinationProfile {
  category: DestinationCategory;
  emoji: string;
  heroBg: string; // Tailwind gradient classes
  slots: TimeSlot[];
}

export const DESTINATION_PROFILES: Record<DestinationCategory, DestinationProfile> = {
  beach: {
    category: 'beach',
    emoji: '🏖️',
    heroBg: 'from-sky-300 via-blue-200 to-teal-100',
    slots: [
      { label: 'morning',   startTime: '07:30', categoryHint: 'nature'   },
      { label: 'midday',    startTime: '12:30', categoryHint: 'food'     },
      { label: 'afternoon', startTime: '15:00', categoryHint: 'nature'   },
      { label: 'evening',   startTime: '18:30', categoryHint: 'nightlife'},
    ],
  },
  mountain: {
    category: 'mountain',
    emoji: '🏔️',
    heroBg: 'from-slate-300 via-green-100 to-emerald-100',
    slots: [
      { label: 'morning',   startTime: '06:30', categoryHint: 'nature'   },
      { label: 'midday',    startTime: '12:00', categoryHint: 'food'     },
      { label: 'afternoon', startTime: '14:30', categoryHint: 'culture'  },
      { label: 'evening',   startTime: '19:00', categoryHint: 'rest'     },
    ],
  },
  heritage: {
    category: 'heritage',
    emoji: '🏯',
    heroBg: 'from-amber-200 via-orange-100 to-yellow-100',
    slots: [
      { label: 'morning',   startTime: '08:00', categoryHint: 'culture'  },
      { label: 'midday',    startTime: '13:00', categoryHint: 'food'     },
      { label: 'afternoon', startTime: '15:30', categoryHint: 'shopping' },
      { label: 'evening',   startTime: '19:30', categoryHint: 'culture'  },
    ],
  },
  backwater: {
    category: 'backwater',
    emoji: '🛶',
    heroBg: 'from-green-200 via-teal-100 to-emerald-200',
    slots: [
      { label: 'morning',   startTime: '07:00', categoryHint: 'nature'   },
      { label: 'midday',    startTime: '12:30', categoryHint: 'food'     },
      { label: 'afternoon', startTime: '14:30', categoryHint: 'culture'  },
      { label: 'evening',   startTime: '17:30', categoryHint: 'nature'   },
    ],
  },
  city: {
    category: 'city',
    emoji: '🌆',
    heroBg: 'from-purple-200 via-pink-100 to-rose-100',
    slots: [
      { label: 'morning',   startTime: '09:00', categoryHint: 'culture'  },
      { label: 'midday',    startTime: '13:00', categoryHint: 'food'     },
      { label: 'afternoon', startTime: '15:30', categoryHint: 'culture'  },
      { label: 'evening',   startTime: '19:00', categoryHint: 'nightlife'},
    ],
  },
};
