import { ToolDefinition, ToolContext } from "./types";

export const findNearbyPlacesTool: ToolDefinition = {
  name: "findNearbyPlaces",
  description: "Find nearby places of interest based on coordinates and type.",
  parameters: {
    type: "object",
    properties: {
      lat: { type: "number" },
      lon: { type: "number" },
      type: { type: "string" }
    },
    required: ["lat", "lon", "type"]
  },
  execute: async (args: any, ctx: ToolContext) => {
    // Stub implementation returning some fake deterministic places
    return {
      result: {
        success: true,
        places: [
          { name: `Nearby ${args.type} 1`, distance: "0.5km" },
          { name: `Nearby ${args.type} 2`, distance: "1.2km" }
        ]
      }
    };
  }
};
