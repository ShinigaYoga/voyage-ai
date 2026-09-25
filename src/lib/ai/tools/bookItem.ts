import { ToolDefinition, ToolContext } from "./types";
import { BookingService } from "@/lib/services/booking/BookingService";

const service = new BookingService();

export const bookItemTool: ToolDefinition = {
  name: "bookItem",
  description: "Book an item (hotel, flight, etc). Always mention it is a prototype reservation.",
  parameters: {
    type: "object",
    properties: {
      itemId: { type: "string" },
      itemType: { type: "string", enum: ["hotel", "flight", "train", "bus", "activity"] },
      price: { type: "number" },
      details: { type: "object" }
    },
    required: ["itemId", "itemType", "price"]
  },
  execute: async (args: any, ctx: ToolContext) => {
    if (!ctx.tripId) {
      throw new Error("tripId is required for booking");
    }
    
    const result = await service.bookItem({
      tripId: ctx.tripId,
      itemId: args.itemId,
      itemType: args.itemType,
      price: args.price,
      details: args.details
    });
    
    return {
      result,
      artifact: {
        type: "booking",
        tripId: ctx.tripId,
        booking: result
      }
    };
  }
};
