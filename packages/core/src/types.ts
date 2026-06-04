export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  text: string;
  toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  result: string;
  isError: boolean;
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface Tool {
  schema: ToolSchema;
  execute: (
    args: Record<string, unknown>,
    workingDir: string,
  ) => Promise<{ result: string; isError: boolean }>;
}

export interface CoreConfig {
  provider: string;
  apiKey: string;
  modelId: string;
  workingDir: string;
  maxIterations: number;
  systemPrompt?: string;
}
