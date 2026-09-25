import { Hotel } from "./types";
import { LocalHotelProvider } from "./providers/LocalHotelProvider";

export class HotelService {
  private provider = new LocalHotelProvider();

  async searchHotels(destination: string, nights: number, budget?: number, travelers?: number): Promise<Hotel[]> {
    const hotels = await this.provider.searchHotels(destination, nights, budget, travelers);
    
    // Score and add recommendation reasons
    return hotels.map(hotel => {
      // Calculate score out of 100
      let score = 0;
      let reason = "";

      // 1. Rating (30%) - assume rating is out of 5
      const ratingScore = (hotel.rating / 5) * 30;
      score += ratingScore;

      // 2. Distance to itinerary (30%) - assume lower is better
      const distanceScore = Math.max(0, 30 - (hotel.distanceFromCenter * 1.5));
      score += distanceScore;

      // 3. Price vs budget (40%)
      let priceScore = 20; // default middle score
      if (budget) {
        const totalCost = hotel.pricePerNight * nights;
        if (totalCost <= budget * 0.8) {
          priceScore = 40;
          reason = "Excellent budget fit.";
        } else if (totalCost <= budget) {
          priceScore = 30;
          reason = "Good fit for your budget.";
        } else {
          priceScore = 10;
          reason = "Slightly over your budget but highly rated.";
        }
      } else {
        if (hotel.pricePerNight < 10000) {
          reason = "Great value for money.";
        } else {
          reason = "Luxury option with premium amenities.";
        }
      }
      
      score += priceScore;
      
      if (hotel.distanceFromCenter < 5) {
        reason += " Very close to the city center.";
      }

      return {
        ...hotel,
        recommendationReason: reason.trim()
      };
    }).sort((a, b) => b.rating - a.rating); // simple sort for now
  }
}
