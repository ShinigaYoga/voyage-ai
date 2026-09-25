import { Restaurant } from "./types";
import { LocalRestaurantProvider } from "./providers/LocalRestaurantProvider";

export class RestaurantService {
  private provider = new LocalRestaurantProvider();

  async searchRestaurants(destination: string, cuisine?: string, budget?: string): Promise<Restaurant[]> {
    return await this.provider.searchRestaurants(destination, cuisine, budget);
  }
}
