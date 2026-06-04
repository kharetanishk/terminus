import { streamAnthropic } from "./anthropic.js";
import { streamGemini } from "./gemini.js";
import { config } from "../config/config.js";
import type { ProviderEvent } from "@terminus/shared";
import type { Message, ToolSchema } from "./anthropic.js";

export async function* streamProvider(
  systemPrompt: string,
  messages: Message[],
  tools: ToolSchema[],
): AsyncGenerator<ProviderEvent> {
  if (config.PROVIDER === "gemini") {
    yield* streamGemini(systemPrompt, messages, tools);
  } else {
    yield* streamAnthropic(systemPrompt, messages, tools);
  }
}
