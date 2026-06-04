import Anthropic from "@anthropic-ai/sdk";
import type { ProviderEvent } from "@terminus/shared";
import type { Message, ToolSchema } from "../types.js";

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
  opts: { apiKey: string; modelId: string },
): AsyncGenerator<ProviderEvent> {
  const client = new Anthropic({ apiKey: opts.apiKey });

  const stream = client.messages.stream({
    model: opts.modelId,
    max_tokens: 8096,
    system: systemPrompt,
    messages: toAnthropicMessages(messages),
    tools: toAnthropicTools(tools),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta" &&
      chunk.delta.text
    ) {
      yield { type: "text_delta", delta: chunk.delta.text };
    }
  }

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
