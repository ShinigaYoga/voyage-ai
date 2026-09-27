export type ActivityCategory = 'food' | 'culture' | 'nature' | 'nightlife' | 'transport' | 'rest' | 'shopping';

export interface Activity {
  id: string;
  name: string;
  location: string;
  startTime: string; // "10:00"
  durationMinutes: number;
  price: number; // INR per person
  category: ActivityCategory;
  description: string;
  bookingRequired?: boolean;
  lat?: number;
  lon?: number;
}

export interface Day {
  dayIndex: number; // 0-based
  date?: string; // ISO date string, optional
  activities: Activity[];
  theme?: string; // narrative theme for the day (arrival, explore, culture, etc.)
}

export type BudgetStatus = 'under' | 'near' | 'over';

export interface BudgetBreakdown {
  transport: number;
  hotel: number;
  food: number;
  activities: number;
  localTransport: number;
  other: number;
  total: number;
  budget: number;
  remaining: number;
  status: BudgetStatus;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  travelers: number;
  budget?: string;
  dates?: string;
  preferences?: string[];
  itinerary?: {
    days: Day[];
  };
  budgetBreakdown?: BudgetBreakdown;
  bookings?: any[];
  notes?: string;
  transport?: any;
  selectedHotel?: { id: string; name?: string; lat?: number; lon?: number; [key: string]: any };
  createdAt: number;
  updatedAt: number;
}

export type MessageType =
  | "text"
  | "trip"
  | "tripUpdated"
  | "transport"
  | "hotel"
  | "restaurant"
  | "attraction"
  | "itinerary"
  | "activity"
  | "booking"
  | "food"
  | "weather";

export interface MessageBase {
  id: string;
  tripId: string;
  role: "user" | "assistant";
  type: MessageType;
  createdAt: number;
}

export interface TextMessage extends MessageBase {
  type: "text";
  content: string;
  attachments?: { url: string; name: string; type: string }[];
}

export interface TripMessage extends MessageBase {
  type: "trip";
  trip: Trip;
}

export interface TripUpdatedMessage extends MessageBase {
  type: "tripUpdated";
  changes: string[];
  trip: Trip;
}

// Stubs for other structured message types
export interface TransportMessage extends MessageBase { type: "transport"; options: any[]; origin?: string; destination?: string; }
export interface HotelMessage extends MessageBase { type: "hotel"; hotels: any[]; }
export interface RestaurantMessage extends MessageBase { type: "restaurant"; restaurants: any[]; }
export interface AttractionMessage extends MessageBase { type: "attraction"; attractions: any[]; }
export interface ItineraryMessage extends MessageBase { type: "itinerary"; itinerary: { days: Day[] }; tripId: string; tripName: string; }
export interface ActivityMessage extends MessageBase { type: "activity"; activities: any[]; }
export interface BookingMessage extends MessageBase { type: "booking"; booking: any; }
export interface FoodMessage extends MessageBase { type: "food"; dishes: any[]; }
export interface WeatherMessage extends MessageBase { type: "weather"; destination: string; forecasts: any[]; summary: string; }

export type Message =
  | TextMessage
  | TripMessage
  | TripUpdatedMessage
  | TransportMessage
  | HotelMessage
  | RestaurantMessage
  | AttractionMessage
  | ItineraryMessage
  | ActivityMessage
  | BookingMessage
  | FoodMessage
  | WeatherMessage;

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type CreateMessageInput = DistributiveOmit<Message, "id" | "createdAt">;

export interface UserProfile {
  id: string; // usually a singleton ID like "default_user"
  name: string;
  bio: string;
  currency: string;
  defaultTravelers: number;
  homeCity: string;
  travelStyles: string[];
  notificationsEnabled: boolean;
  avatarUrl?: string;
  theme?: 'light' | 'dark' | 'system';
}
