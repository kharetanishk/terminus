import { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config/config.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function messageController(req: Request, res: Response) {
  const { message, history = [] } = req.body as {
    message: string;
    history: ChatMessage[];
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", config.ALLOWED_ORIGIN);
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const stream = client.messages.stream({
      model: config.MODEL_ID,
      max_tokens: 4096,
      system: "You are a helpful assistant. Answer clearly and concisely.",
      messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta" &&
        chunk.delta.text
      ) {
        send({ type: "delta", text: chunk.delta.text });
      }
    }

    send({ type: "done" });
  } catch (err) {
    send({
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    res.end();
  }
}
