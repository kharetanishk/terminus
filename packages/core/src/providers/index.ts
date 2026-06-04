import type { ProviderEvent } from "@terminus/shared";
import type { Message, ToolSchema } from "../types.js";
import { streamAnthropic } from "./anthropic.js";
import { streamGemini } from "./gemini.js";

export async function* streamProvider(
  systemPrompt: string,
  messages: Message[],
  tools: ToolSchema[],
  opts: { provider: string; apiKey: string; modelId: string },
): AsyncGenerator<ProviderEvent> {
  if (opts.provider === "gemini") {
    yield* streamGemini(systemPrompt, messages, tools, opts);
  } else {
    yield* streamAnthropic(systemPrompt, messages, tools, opts);
  }
}
