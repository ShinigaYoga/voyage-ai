import { ToolDefinition, ToolContext } from "./types";
import { HotelService } from "@/lib/services/hotels";

const service = new HotelService();

export const searchHotelsTool: ToolDefinition = {
  name: "searchHotels",
  description: "Search for hotels in a destination. Returns scored recommendations.",
  parameters: {
    type: "object",
    properties: {
      destination: { type: "string" },
      nights: { type: "number", description: "Number of nights to stay" },
      budget: { type: "number", description: "Optional budget for the entire stay" },
      travelers: { type: "number" }
    },
    required: ["destination", "nights"]
  },
  execute: async (args: any, ctx: ToolContext) => {
    const { destination, nights, budget, travelers } = args;
    const hotels = await service.searchHotels(destination, nights, budget, travelers);
    
    return {
      result: {
        success: true,
        message: `Found ${hotels.length} hotels in ${destination}.`,
      },
      artifact: {
        type: "hotel",
        tripId: ctx.tripId,
        hotels
      }
    };
  }
};
