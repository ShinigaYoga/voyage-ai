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
        msg.includes("503") ||
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
      return result;
    } catch (err: any) {
      const msg: string = err.message || "";
      console.error(`[GeminiProvider] Attempt 1 failed with error:`, msg);
      if (isAuthOrConfigError(msg)) {
        return {
          content: "The AI model configured is unavailable or auth failed. Check the model name/key in config.",
          toolCalls: [],
          finishReason: "error",
          error: msg,
        };
      }
      if (!isRetryableError(msg)) {
        return {
          content: `An unexpected error occurred: ${msg}`,
          toolCalls: [],
          finishReason: "error",
          error: msg,
        };
      }

      console.warn(`[GeminiProvider] Attempt 1 (${this.primaryModelName}) failed: ${msg}. Retrying in 1500ms...`);
    }

    await sleep(1500);

    // Attempt 2: primary model
    try {
      const result = await runWithTimeout(this.primaryModelName);
      console.log(`[GeminiProvider] Attempt 2 (${this.primaryModelName}) succeeded.`);
      return result;
    } catch (err: any) {
      const msg: string = err.message || "";
      console.warn(`[GeminiProvider] Attempt 2 (${this.primaryModelName}) failed: ${msg}. Returning error state.`);
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

