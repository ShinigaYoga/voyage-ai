export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'failed' | 'cancelled';

export type BookingRequest = {
  tripId: string;
  itemId: string;
  itemType: 'hotel' | 'flight' | 'train' | 'bus' | 'activity' | 'restaurant';
  price: number;
  details: any;
};

export type BookingResult = {
  id: string;
  tripId: string;
  itemId: string;
  itemType: string;
  price: number;
  status: BookingStatus;
  message: string;
  confirmationCode?: string;
  details: any;
  createdAt: number;
};

export class BookingService {
  async bookItem(request: BookingRequest): Promise<BookingResult> {
    // Artificial delay to simulate booking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 90% success rate
    if (Math.random() > 0.1) {
      return {
        id: `bkg-${Math.random().toString(36).substring(2, 9)}`,
        tripId: request.tripId,
        itemId: request.itemId,
        itemType: request.itemType,
        price: request.price,
        details: request.details,
        status: 'confirmed',
        message: 'Booking recorded. This is a prototype — no external reservation was made.',
        confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: Date.now()
      };
    } else {
      return {
        id: `bkg-${Math.random().toString(36).substring(2, 9)}`,
        tripId: request.tripId,
        itemId: request.itemId,
        itemType: request.itemType,
        price: request.price,
        details: request.details,
        status: 'failed',
        message: 'Payment failed. Please try again.',
        createdAt: Date.now()
      };
    }
  }
}
