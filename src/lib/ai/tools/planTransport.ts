import { ToolDefinition } from "./types";
import { TransportPlanningService } from "@/lib/services/transport/TransportPlanningService";

const planningService = new TransportPlanningService();

export const planTransportTool: ToolDefinition = {
  name: "planTransport",
  description:
    "Show transport planning guidance — estimated price trends and best booking windows — when the user is asking about travelling between two places on a specific FUTURE date (7 or more days away). " +
    "Call this tool INSTEAD of searchTransport when a departure date is given and is >= 7 days in the future. " +
    "Do NOT call this for past or same-day travel, or when the user asks to compare exact prices or book now. " +
    "Extract origin, destination, and departure date from the user's message.",
  parameters: {
    type: "object",
    properties: {
      origin: {
        type: "string",
        description: "Origin city extracted from user message (e.g. 'Chennai', 'Mumbai')",
      },
      destination: {
        type: "string",
        description: "Destination city extracted from user message (e.g. 'Delhi', 'Goa')",
      },
      departureDate: {
        type: "string",
        description: "Departure date in ISO 8601 format (e.g. '2026-12-20'). Parse from user message.",
      },
      tripId: {
        type: "string",
        description: "Optional trip ID to associate this plan with.",
      },
    },
    required: ["origin", "destination", "departureDate"],
  },
  execute: async (args: any) => {
    const { origin, destination, departureDate, tripId } = args;

    // Guard: verify the date is actually in the future and ≥7 days ahead
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const depDate = new Date(departureDate);
    depDate.setHours(0, 0, 0, 0);
    const daysToDeparture = Math.floor(
      (depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToDeparture < 7) {
      return {
        result: {
          status: "too_soon",
          message:
            daysToDeparture < 0
              ? "That departure date is in the past. Please check live booking sources for current availability."
              : `Only ${daysToDeparture} days until departure — too close for planning guidance. Check live booking sources for real-time availability and pricing.`,
          origin,
          destination,
          departureDate,
          daysToDeparture,
        },
      };
    }

    const plans = planningService.generateTransportPlan(origin, destination, departureDate);

    if (!plans || plans.length === 0) {
      return {
        result: {
          status: "no_plans",
          message: "No applicable transport modes found for this route.",
          origin,
          destination,
          departureDate,
        },
      };
    }

    const { getTransportService } = await import("@/lib/services/transport");
    const service = getTransportService();
    const options = await service.search({
      origin,
      destination,
      date: departureDate,
      passengers: 2,
    });

    return {
      result: {
        status: "ok",
        origin,
        destination,
        departureDate,
        daysToDeparture,
        modesFound: plans.map((p) => p.mode),
      },
      artifact: {
        type: "unified_transport",
        tripId: tripId || "",
        origin,
        destination,
        departureDate,
        plans,
        options,
      },
    };
  },
};
