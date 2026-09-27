export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  content: string | null;
  toolCalls: AIToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  error?: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIProvider {
  name: string;
  chat(
    messages: AIMessage[],
    tools: AIToolDefinition[],
  ): Promise<AIResponse>;
}
