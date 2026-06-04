import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import type { ProviderEvent } from "@terminus/shared";
import type { Message, ToolSchema } from "../types.js";

function toGeminiMessages(messages: Message[]) {
  const contents: Array<{
    role: "user" | "model";
    parts: Array<Record<string, unknown>>;
  }> = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      for (const tc of msg.toolCalls) {
        parts.push({
          functionCall: { id: tc.id, name: tc.name, args: tc.args },
        });
      }

      if (parts.length > 0) {
        contents.push({ role: "model", parts });
      }
    } else if (msg.role === "toolResult") {
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              id: msg.toolCallId,
              name: msg.toolName,
              response: {
                output: msg.isError ? `ERROR: ${msg.result}` : msg.result,
              },
            },
          },
        ],
      });
    }
  }

  return contents;
}

function toGeminiTools(tools: ToolSchema[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: Type.OBJECT,
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties).map(([key, prop]) => [
              key,
              { type: Type.STRING, description: prop.description },
            ]),
          ),
          required: t.parameters.required,
        },
      })),
    },
  ];
}

export async function* streamGemini(
  systemPrompt: string,
  messages: Message[],
  tools: ToolSchema[],
  opts: { apiKey: string; modelId: string },
): AsyncGenerator<ProviderEvent> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });

  const stream = await client.models.generateContentStream({
    model: opts.modelId,
    contents: toGeminiMessages(messages),
    config: {
      systemInstruction: systemPrompt,
      tools: toGeminiTools(tools),
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    },
  });

  for await (const chunk of stream) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.text) {
        yield { type: "text_delta", delta: part.text };
      }

      if (part.functionCall) {
        yield {
          type: "tool_start",
          name: part.functionCall.name as string,
          args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        };
      }
    }
  }
}
