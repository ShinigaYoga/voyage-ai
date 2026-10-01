import { AIProvider, AIMessage, AIToolDefinition } from "./providers/AIProvider";
import { ToolDefinition, ToolContext } from "./tools/types";
import { Trip } from "@/lib/types";
import type { TransportOption } from "@/lib/services/transport/types";
import type { TransportPlan } from "@/lib/services/transport/planningTypes";
import type { TransportBookingAdvice } from "@/lib/services/transport/transportAdvice";

export type AgentResult = {
  textContent: string | null;
  artifacts: Array<
    | { type: 'trip'; trip: Trip }
    | { type: 'itinerary'; itinerary: any; tripId?: string; tripName?: string }
    | { type: 'tripUpdated'; changes: string[]; trip: Trip }
    | { type: 'transport'; tripId: string; options: any[]; origin?: string; destination?: string }
    | { type: 'hotel'; tripId: string; hotels: any[] }
    | { type: 'restaurant'; tripId: string; restaurants: any[] }
    | { type: 'attraction'; tripId: string; attractions: any[] }
    | { type: 'booking'; tripId: string; booking: any }
    | {
        type: 'unified_transport';
        tripId: string;
        origin: string;
        destination: string;
        departureDate?: string;
        returnDate?: string;
        today: string;
        daysToGo?: number;
        bookingAdvice?: TransportBookingAdvice;
        plans: TransportPlan[];
        options: TransportOption[];
        source: 'estimate' | 'live';
      }
  >;
  errors: string[];
};

export class Agent {
  constructor(
    private provider: AIProvider,
    private tools: Record<string, ToolDefinition>,
    private toolContext: ToolContext
  ) {}

  async run(
    messages: AIMessage[],
    onProgress?: (status: string) => void
  ): Promise<AgentResult> {
    const currentMessages: AIMessage[] = [...messages];
    const artifacts: AgentResult["artifacts"] = [];
    const errors: string[] = [];

    // Map tool definitions to AIToolDefinition
    const toolDefs: AIToolDefinition[] = Object.values(this.tools).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    let maxIterations = 6;
    let finalContent: string | null = null;

    while (maxIterations > 0) {
      maxIterations--;

      if (onProgress) {
        onProgress("Understanding your trip...");
      }

      const response = await this.provider.chat(currentMessages, toolDefs);

      if (response.error) {
        errors.push(response.error);
      }

      if (response.content) {
        finalContent = response.content;
      }

      // If no tool calls, loop ends
      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      for (const call of response.toolCalls) {
        const tool = this.tools[call.name];
        if (!tool) {
          errors.push(`Tool ${call.name} not found`);
          continue;
        }

        if (onProgress) {
          if (call.name === "createTrip") onProgress("Creating trip...");
          else if (call.name === "createItinerary") onProgress("Building itinerary...");
          else if (call.name === "updateTrip") onProgress("Updating trip...");
          else if (call.name === "calculateBudget") onProgress("Calculating budget...");
          else if (call.name === "searchTransport") onProgress("Searching transport options...");
          else if (call.name === "compareTransport") onProgress("Comparing transport...");
          else if (call.name === "selectTransport") onProgress("Selecting transport...");
          else if (call.name === "searchHotels") onProgress("Finding the perfect stay...");
          else if (call.name === "searchRestaurants") onProgress("Discovering local cuisine...");
          else if (call.name === "searchAttractions") onProgress("Exploring places to visit...");
          else if (call.name === "findNearbyPlaces") onProgress("Looking nearby...");
          else onProgress("Processing request...");
        }

        try {
          const { result, artifact } = await tool.execute(call.arguments, this.toolContext);
          if (artifact) {
            if (artifact.type === "itinerary") {
              const itineraryTripId = artifact.tripId || this.toolContext.tripId;
              const existingIndex = itineraryTripId
                ? artifacts.findIndex(existing =>
                    existing.type === "itinerary" &&
                    (existing.tripId || this.toolContext.tripId) === itineraryTripId
                  )
                : -1;
              if (existingIndex >= 0) {
                artifacts[existingIndex] = artifact as AgentResult["artifacts"][number];
              } else {
                artifacts.push(artifact as AgentResult["artifacts"][number]);
              }
            } else {
              artifacts.push(artifact as any);
            }
          }

          // Append assistant message with tool call
          currentMessages.push({
            role: "assistant",
            content: response.content || "",
            toolCallId: call.id,
            toolName: call.name,
          });

          // Append tool result message
          currentMessages.push({
            role: "tool",
            content: JSON.stringify(result),
            toolCallId: call.id,
            toolName: call.name,
          });
        } catch (err: any) {
          const errMsg = err.message || `Error executing ${call.name}`;
          errors.push(errMsg);
          currentMessages.push({
            role: "tool",
            content: JSON.stringify({ error: errMsg }),
            toolCallId: call.id,
            toolName: call.name,
          });
        }
      }
    }

    return {
      textContent: finalContent,
      artifacts,
      errors,
    };
  }
}
