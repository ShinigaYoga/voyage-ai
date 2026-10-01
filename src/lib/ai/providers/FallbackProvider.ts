import { AIProvider, AIMessage, AIToolDefinition, AIResponse } from "./AIProvider";

const AUTH_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const providerUnavailableUntil = new Map<string, number>();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPermanentAuthFailure(message: string): boolean {
  return /(?:\b401\b|\b403\b|PERMISSION_DENIED|UNAUTHENTICATED|CONSUMER_SUSPENDED)/i.test(message);
}

function markProviderUnavailable(providerName: string): void {
  const unavailableUntil = providerUnavailableUntil.get(providerName) ?? 0;
  if (unavailableUntil > Date.now()) return;
  providerUnavailableUntil.set(providerName, Date.now() + AUTH_FAILURE_COOLDOWN_MS);
  console.warn(`[FallbackProvider] ${providerName} disabled for 10 minutes after a permanent authentication failure.`);
}

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
    const unavailableUntil = providerUnavailableUntil.get(this.primary.name) ?? 0;
    if (unavailableUntil <= Date.now()) {
      try {
        const primaryResponse = await this.primary.chat(messages, tools);
        if (primaryResponse.finishReason !== "error") return primaryResponse;
        const details = primaryResponse.error || primaryResponse.content || "";
        if (isPermanentAuthFailure(details)) {
          markProviderUnavailable(this.primary.name);
        } else {
          console.warn(`[FallbackProvider] ${this.primary.name} failed; trying fallback.`);
        }
      } catch (primaryError: unknown) {
        const details = errorMessage(primaryError);
        if (isPermanentAuthFailure(details)) {
          markProviderUnavailable(this.primary.name);
        } else {
          console.warn(`[FallbackProvider] ${this.primary.name} failed; trying fallback.`);
        }
      }
    }

    try {
      const fallbackResponse = await this.fallback.chat(messages, tools);
      if (fallbackResponse.finishReason !== "error") return fallbackResponse;
      console.error(`[FallbackProvider] ${this.fallback.name} returned an error response.`);
    } catch {
      console.error(`[FallbackProvider] ${this.fallback.name} failed.`);
    }

    return {
      content: "I'm having trouble reaching the AI right now. Please try again in a moment.",
      toolCalls: [],
      finishReason: "error",
      error: "All providers failed",
    };
  }
}
