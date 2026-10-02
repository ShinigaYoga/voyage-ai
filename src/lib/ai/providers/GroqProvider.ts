import Groq from "groq-sdk";
import { AIProvider, AIMessage, AIToolDefinition, AIResponse, AIToolCall } from "./AIProvider";

export class GroqProvider implements AIProvider {
  name = "GroqProvider";
  private ai: Groq;
  private modelName = "openai/gpt-oss-20b";

  constructor(apiKey: string) {
    this.ai = new Groq({ apiKey });
  }

  async chat(
    messages: AIMessage[],
    tools: AIToolDefinition[]
  ): Promise<AIResponse> {
    const runWithTimeout = async () => {
      const timeoutPromise = new Promise<AIResponse>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Groq API request timed out after 60 seconds`)),
          60_000
        );
      });
      return Promise.race([this.executeChat(messages, tools), timeoutPromise]);
    };

    try {
      return await runWithTimeout();
    } catch (err: any) {
      const msg: string = err.message || "";
      console.warn(`[GroqProvider] failed: ${msg}`);

      return {
        content: `Couldn't reach Groq: ${msg || "Unknown error"}`,
        toolCalls: [],
        finishReason: "error",
        error: msg,
      };
    }
  }

  private async executeChat(
    messages: AIMessage[],
    tools: AIToolDefinition[]
  ): Promise<AIResponse> {
    const start = Date.now();

    // Format tools for Groq
    const groqTools: any[] = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    // Format messages for Groq
    const groqMessages: any[] = [];
    
    for (const msg of messages) {
      if (msg.role === "system") {
        groqMessages.push({ role: "system", content: msg.content });
      } else if (msg.role === "user") {
        groqMessages.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        const groqMsg: any = { role: "assistant", content: msg.content || "" };
        if (msg.toolCallId && msg.toolName) {
          groqMsg.tool_calls = [
            {
              id: msg.toolCallId,
              type: "function",
              function: { name: msg.toolName, arguments: "{}" }, // We don't have the original args in history, but id/name is sufficient for sequence
            }
          ];
        }
        groqMessages.push(groqMsg);
      } else if (msg.role === "tool") {
        groqMessages.push({
          role: "tool",
          tool_call_id: msg.toolCallId || "unknown",
          name: msg.toolName || "tool",
          content: msg.content,
        });
      }
    }

    const completionParams: any = {
      model: this.modelName,
      messages: groqMessages,
      max_tokens: 2048,
      ...(this.modelName.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      tools: groqTools.length > 0 ? groqTools : undefined,
      tool_choice: groqTools.length > 0 ? "auto" : undefined,
      ...(groqTools.length === 0 ? { response_format: { type: "json_object" } } : {}),
    };

    const response = await this.ai.chat.completions.create(completionParams);

    const elapsed = Date.now() - start;
    console.log(`[GroqProvider] ${this.modelName} responded in ${elapsed}ms`);

    const choice = response.choices[0];

    if (!choice) {
      return { content: "No response from AI", toolCalls: [], finishReason: "stop" };
    }

    const textContent = choice.message.content || null;
    const toolCalls: AIToolCall[] = [];
    const functionCalls = choice.message.tool_calls || [];

    if (functionCalls.length > 0) {
      for (const fc of functionCalls) {
        if (fc.type === "function") {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(fc.function.arguments);
          } catch (e) {
            console.warn(`[GroqProvider] Failed to parse tool arguments for ${fc.function.name}: ${fc.function.arguments}`);
          }
          
          toolCalls.push({
            id: fc.id,
            name: fc.function.name,
            arguments: parsedArgs,
          });
        }
      }
    }

    let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop';
    if (choice.finish_reason === 'tool_calls' || toolCalls.length > 0) {
      finishReason = 'tool_calls';
    } else if (choice.finish_reason === 'length') {
      finishReason = 'length';
    }

    return {
      content: textContent,
      toolCalls,
      finishReason,
    };
  }
}
