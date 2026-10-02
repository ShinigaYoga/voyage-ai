import { AIProvider, AIMessage, AIToolDefinition, AIResponse } from "./AIProvider";

const AUTH_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const providerUnavailableUntil = new Map<string, number>();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeErrorMessage(message: string): string {
  return message
    .replace(/(api[_ -]?key\s*[:=]\s*)[^'"\s,}]+/gi, "$1[REDACTED]")
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,}]+/gi, "$1[REDACTED]")
    .replace(/\b(?:AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9_-]{20,})\b/g, "[REDACTED]");
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
    const failures: string[] = [];
    const unavailableUntil = providerUnavailableUntil.get(this.primary.name) ?? 0;
    if (unavailableUntil <= Date.now()) {
      try {
        const primaryResponse = await this.primary.chat(messages, tools);
        if (primaryResponse.finishReason !== "error") return primaryResponse;
        const details = primaryResponse.error || primaryResponse.content || "";
        if (isPermanentAuthFailure(details)) {
          markProviderUnavailable(this.primary.name);
        } else {
          console.warn(`[FallbackProvider] ${this.primary.name} failed; trying fallback: ${safeErrorMessage(details)}`);
        }
        failures.push(`${this.primary.name}: ${details || "returned an error response"}`);
      } catch (primaryError: unknown) {
        const details = errorMessage(primaryError);
        if (isPermanentAuthFailure(details)) {
          markProviderUnavailable(this.primary.name);
        } else {
          console.warn(`[FallbackProvider] ${this.primary.name} failed; trying fallback: ${safeErrorMessage(details)}`);
        }
        failures.push(`${this.primary.name}: ${details}`);
      }
    }

    try {
      const fallbackResponse = await this.fallback.chat(messages, tools);
      if (fallbackResponse.finishReason !== "error") return fallbackResponse;
      const details = fallbackResponse.error || fallbackResponse.content || "returned an error response";
      failures.push(`${this.fallback.name}: ${details}`);
      console.error(`[FallbackProvider] ${this.fallback.name} returned an error response: ${safeErrorMessage(details)}`);
    } catch (fallbackError: unknown) {
      const details = errorMessage(fallbackError);
      failures.push(`${this.fallback.name}: ${details}`);
      console.error(`[FallbackProvider] ${this.fallback.name} failed: ${safeErrorMessage(details)}`);
    }

    return {
      content: "I'm having trouble reaching the AI right now. Please try again in a moment.",
      toolCalls: [],
      finishReason: "error",
      error: `All providers failed. ${failures.join("; ")}`,
    };
  }
}
