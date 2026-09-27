import { ToolDefinition, ToolContext } from "./types";
import { AttractionService } from "@/lib/services/attractions";

const service = new AttractionService();

export const searchAttractionsTool: ToolDefinition = {
  name: "searchAttractions",
  description: "Search for attractions in a destination by category.",
  parameters: {
    type: "object",
    properties: {
      destination: { type: "string" },
      category: { type: "string", enum: ["beach", "fort", "temple", "museum", "nature", "market", "nightlife"] }
    },
    required: ["destination"]
  },
  execute: async (args: any, ctx: ToolContext) => {
    const { destination, category } = args;
    const attractions = await service.searchAttractions(destination, category);
    
    return {
      result: {
        success: true,
        message: `Found ${attractions.length} attractions in ${destination}.`,
      },
      artifact: {
        type: "attraction",
        tripId: ctx.tripId,
        attractions
      }
    };
  }
};
