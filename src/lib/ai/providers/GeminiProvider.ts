import { GoogleGenAI, FunctionDeclaration } from "@google/genai";
import { AIProvider, AIMessage, AIToolDefinition, AIResponse, AIToolCall } from "./AIProvider";
import { GEMINI_MODEL } from "../config";

export class GeminiProvider implements AIProvider {
  name = "GeminiProvider";
  private ai: GoogleGenAI;
  private primaryModelName = GEMINI_MODEL;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(
    messages: AIMessage[],
    tools: AIToolDefinition[]
  ): Promise<AIResponse> {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const isRetryableError = (msg: string) => {
      return (
        /\b5\d{2}\b/.test(msg) ||
        msg.includes("429") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("timed out")
      );
    };

    const isAuthOrConfigError = (msg: string) => {
      return (
        msg.includes("400") ||
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("404") ||
        msg.includes("is not found") ||
        msg.includes("MODEL_NOT_FOUND")
      );
    };

    const runWithTimeout = async (modelName: string) => {
      const timeoutPromise = new Promise<AIResponse>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Gemini API request timed out after 60 seconds`)),
          60_000
        );
      });
      return Promise.race([this.executeChat(messages, tools, modelName), timeoutPromise]);
    };

    try {
      const result = await runWithTimeout(this.primaryModelName);
      console.log(`[GeminiProvider] Attempt 1 SUCCESS: model=${this.primaryModelName} finishReason=${result.finishReason} contentLen=${result.content?.length ?? 0}`);
      return result;
    } catch (err: any) {
      const msg: string = err.message || "";
      const isAuthOrConfig = isAuthOrConfigError(msg);
      if (!isAuthOrConfig) {
        console.error(`[GeminiProvider] Attempt 1 failed for model=${this.primaryModelName}.`);
      }

      if (isAuthOrConfig) {
        return {
          content: "The AI model configured is unavailable or auth failed. Check the model name/key in config.",
          toolCalls: [],
          finishReason: "error",
          error: msg,
        };
      }

      // Check for rate limit / 429 / quota
      const isQuotaOr429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");
      let retryDelayMs: number | null = null;

      if (isQuotaOr429) {
        // Extract retry delay if present, e.g. "retry in 5.2s" or "RetryInfo", "retryDelay":"5s"
        const match = msg.match(/retry (?:in )?([0-9.]+)\s*s/i) || msg.match(/"retryDelay":\s*"([0-9.]+)s"/i);
        if (match) {
          retryDelayMs = Math.round(parseFloat(match[1]) * 1000);
        }
      }

      // If it's a 429 with delay > 5s or no short retry specified, fail fast to let FallbackProvider (Groq) handle it
      if (isQuotaOr429 && (retryDelayMs === null || retryDelayMs > 5000 || msg.includes("free_tier_requests"))) {
        console.warn(`[GeminiProvider] Quota/429 limit exceeded (${retryDelayMs ? retryDelayMs + 'ms' : 'no short delay'}). Failing fast to fallback provider.`);
        return {
          content: `Gemini rate limit exceeded: ${msg}`,
          toolCalls: [],
          finishReason: "error",
          error: msg,
        };
      }

      if (!isRetryableError(msg)) {
        console.error(`[GeminiProvider] Non-retryable error — returning error state. Full msg: ${msg}`);
        return {
          content: `An unexpected error occurred: ${msg}`,
          toolCalls: [],
          finishReason: "error",
          error: msg,
        };
      }

      const waitTime = retryDelayMs ?? 1500;
      console.warn(`[GeminiProvider] Attempt 1 (${this.primaryModelName}) failed: ${msg}. Retrying in ${waitTime}ms...`);
      await sleep(waitTime);
    }

    // Attempt 2: primary model
    try {
      const result = await runWithTimeout(this.primaryModelName);
      console.log(`[GeminiProvider] Attempt 2 SUCCESS: model=${this.primaryModelName} finishReason=${result.finishReason}`);
      return result;
    } catch (err: any) {
      const msg: string = err.message || "";
      if (!isAuthOrConfigError(msg)) {
        console.warn(`[GeminiProvider] Attempt 2 failed for model=${this.primaryModelName}. Returning error state.`);
      }
      return {
        content: `Couldn't reach Gemini: ${msg || "Unknown error"}`,
        toolCalls: [],
        finishReason: "error",
        error: msg,
      };
    }
  }

  private async executeChat(
    messages: AIMessage[],
    tools: AIToolDefinition[],
    modelName: string
  ): Promise<AIResponse> {
    const start = Date.now();

    // Map tool definitions to new SDK FunctionDeclarations
    const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.parameters as any, // Accepts standard JSON schema types
    }));

    const systemInstructionMessage = messages.find((m) => m.role === "system");

    // Format chat history for Gemini
    const contents: any[] = [];
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    for (const msg of nonSystemMessages) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: msg.content || "" }] });
      } else if (msg.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: msg.toolName || "tool",
                response: { result: msg.content },
              },
            },
          ],
        });
      }
    }

    const response = await this.ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemInstructionMessage
          ? systemInstructionMessage.content
          : undefined,
        tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
      },
    });

    const elapsed = Date.now() - start;
    console.log(`[GeminiProvider] ${modelName} responded in ${elapsed}ms`);

    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      return { content: "No response from AI", toolCalls: [], finishReason: "stop" };
    }

    const textContent = response.text || null;
    console.log(`[GeminiProvider.executeChat] model=${modelName} elapsed=${elapsed}ms textLen=${textContent?.length ?? 0} first500=${textContent?.slice(0,500) ?? '(null)'} numToolCalls=${response.functionCalls?.length ?? 0}`);

    const toolCalls: AIToolCall[] = [];
    const functionCalls = response.functionCalls || [];

    if (functionCalls.length > 0) {
      for (const fc of functionCalls) {
        if (fc) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: fc.name || "unknown",
            arguments: (fc.args as Record<string, unknown>) || {},
          });
        }
      }
    }

    return {
      content: textContent,
      toolCalls,
      finishReason: toolCalls.length > 0 ? "tool_calls" : "stop",
    };
  }
}
