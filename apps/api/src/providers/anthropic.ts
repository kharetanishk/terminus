import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/config.js";
import type { ProviderEvent } from "@terminus/shared";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// Internal message types
// These are YOUR types — what the agent loop works with
// ─────────────────────────────────────────────

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  toolCalls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  text: string;
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

// ─────────────────────────────────────────────
// Convert YOUR messages → Anthropic format
// This is the translation layer
// ─────────────────────────────────────────────

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      result.push({
        role: "user",
        content: msg.content,
      });
    } else if (msg.role === "assistant") {
      // assistant message may have text, tool calls, or both
      const content: Anthropic.ContentBlockParam[] = [];

      if (msg.text) {
        content.push({ type: "text", text: msg.text });
      }

      for (const tc of msg.toolCalls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.args,
        });
      }

      result.push({ role: "assistant", content });
    } else if (msg.role === "toolResult") {
      // tool results go back as role: "user" with type: "tool_result"
      result.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.toolCallId,
            content: msg.result,
          },
        ],
      });
    }
  }

  return result;
}

// Convert YOUR tool schemas → Anthropic format
function toAnthropicTools(tools: ToolSchema[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

// ─────────────────────────────────────────────
// The streaming function
// Emits only ProviderEvents — text_delta and tool_start
// Everything else (turn tracking, tool execution) is the loop's job
// ─────────────────────────────────────────────

export async function* streamAnthropic(
  systemPrompt: string,
  messages: Message[],
  tools: ToolSchema[],
): AsyncGenerator<ProviderEvent> {
  const stream = client.messages.stream({
    model: config.MODEL_ID,
    max_tokens: 8096,
    system: systemPrompt,
    messages: toAnthropicMessages(messages),
    tools: toAnthropicTools(tools),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { type: "text_delta", delta: event.delta.text };
    }

    if (event.type === "content_block_stop") {
      const block = stream.currentMessage?.content[event.index];
      if (block?.type === "tool_use") {
        yield {
          type: "tool_start",
          name: block.name,
          args: block.input as Record<string, unknown>,
        };
      }
    }
  }
}
