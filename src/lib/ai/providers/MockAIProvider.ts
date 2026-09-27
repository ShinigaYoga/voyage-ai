import { AIProvider, AIMessage, AIToolDefinition, AIResponse } from "./AIProvider";

export class MockAIProvider implements AIProvider {
  name = "MockAIProvider";

  async chat(
    messages: AIMessage[],
    tools: AIToolDefinition[]
  ): Promise<AIResponse> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const lower = lastUserMsg.toLowerCase();

    const hasToolExecuted = messages.some((m) => m.role === "tool");

    if (!hasToolExecuted && tools.length > 0) {
      if (/goa|manali|kerala|visit|trip/i.test(lower)) {
        const createTripTool = tools.find((t) => t.name === "createTrip");
        if (createTripTool) {
          const dest = /manali/i.test(lower) ? "Manali" : /kerala/i.test(lower) ? "Kerala" : "Goa";
          return {
            content: null,
            toolCalls: [
              {
                id: `call_${Date.now()}`,
                name: "createTrip",
                arguments: {
                  destination: dest,
                  travelers: /3/i.test(lower) ? 3 : 2,
                  budget: 25000,
                  preferences: ["beaches", "food"],
                },
              },
            ],
            finishReason: "tool_calls",
          };
        }
      }
    }

    return {
      content:
        "I'm running in offline mode without an AI provider configured. Set GEMINI_API_KEY in .env.local to enable full trip planning.",
      toolCalls: [],
      finishReason: "stop",
    };
  }
}
