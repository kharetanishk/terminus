import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/config.js";
import type { ProviderEvent } from "@terminus/shared";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

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

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      const content: Anthropic.MessageParam["content"] = [];

      if (msg.text) {
        content.push({
          type: "text",
          text: msg.text,
        } as Anthropic.TextBlockParam);
      }

      for (const tc of msg.toolCalls) {
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.args,
        } as Anthropic.ToolUseBlockParam);
      }

      result.push({ role: "assistant", content });
    } else if (msg.role === "toolResult") {
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

function toAnthropicTools(tools: ToolSchema[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

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

  // stream text live as it arrives
  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield { type: "text_delta", delta: chunk.delta.text };
    }
  }

  // after streaming completes, emit tool calls with fully assembled args
  const finalMessage = await stream.finalMessage();

  for (const block of finalMessage.content) {
    if (block.type === "tool_use") {
      yield {
        type: "tool_start",
        name: block.name,
        args: block.input as Record<string, unknown>,
      };
    }
  }
}
