import { ToolDefinition, ToolContext } from "./types";
import { RestaurantService } from "@/lib/services/restaurants";

const service = new RestaurantService();

export const searchRestaurantsTool: ToolDefinition = {
  name: "searchRestaurants",
  description: "Search for restaurants in a destination by cuisine and budget.",
  parameters: {
    type: "object",
    properties: {
      destination: { type: "string" },
      cuisine: { type: "string" },
      budget: { type: "string", enum: ["₹", "₹₹", "₹₹₹"] }
    },
    required: ["destination"]
  },
  execute: async (args: any, ctx: ToolContext) => {
    const { destination, cuisine, budget } = args;
    const restaurants = await service.searchRestaurants(destination, cuisine, budget);
    
    return {
      result: {
        success: true,
        message: `Found ${restaurants.length} restaurants in ${destination}.`,
      },
      artifact: {
        type: "restaurant",
        tripId: ctx.tripId,
        restaurants
      }
    };
  }
};
