import { AIProvider, AIMessage, AIToolDefinition, AIResponse } from "./AIProvider";

export class FallbackProvider implements AIProvider {
  name = "FallbackProvider";

  constructor(
    private primary: AIProvider,
    private fallback: AIProvider
  ) {}

  async chat(
    messages: AIMessage[],
    tools: AIToolDefinition[]
  ): Promise<AIResponse> {
    console.log(`[FallbackProvider] Attempting primary provider: ${this.primary.name}`);
    
    try {
      const primaryResponse = await this.primary.chat(messages, tools);
      
      if (primaryResponse.finishReason === 'error') {
        console.warn(`[FallbackProvider] Primary provider returned error state: ${primaryResponse.error || primaryResponse.content}`);
        throw new Error(primaryResponse.error || "Primary provider failed gracefully");
      }
      
      return primaryResponse;
    } catch (primaryErr: any) {
      console.warn(`[FallbackProvider] Primary provider (${this.primary.name}) failed: ${primaryErr.message}. Switching to fallback...`);
      
      try {
        console.log(`[FallbackProvider] Attempting fallback provider: ${this.fallback.name}`);
        const fallbackResponse = await this.fallback.chat(messages, tools);
        
        if (fallbackResponse.finishReason === 'error') {
          console.warn(`[FallbackProvider] Fallback provider returned error state: ${fallbackResponse.error || fallbackResponse.content}`);
          throw new Error(fallbackResponse.error || "Fallback provider failed gracefully");
        }
        
        return fallbackResponse;
      } catch (fallbackErr: any) {
        console.error(`[FallbackProvider] Both providers failed. Primary: ${primaryErr.message}, Fallback: ${fallbackErr.message}`);
        
        return {
          content: "I'm having trouble reaching the AI right now. Please try again in a moment.",
          toolCalls: [],
          finishReason: 'error',
          error: "All providers failed",
        };
      }
    }
  }
}
