import { ToolDefinition } from "./types";

export const updateItineraryTool: ToolDefinition = {
  name: 'updateItinerary',
  description: 'Add, remove, or modify days/activities in an itinerary.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action to perform: add_day, remove_day, or modify_activity' },
      dayNumber: { type: 'number', description: 'Target day number' },
      activityText: { type: 'string', description: 'Description of the activity or change' },
    },
  },
  execute: async (args, ctx) => {
    const action = args.action || "add_day";
    const note = `Updated itinerary: ${action} for day ${args.dayNumber || 1}. ${args.activityText || ""}`;
    return {
      result: { success: true, note },
    };
  },
};
