import { Request, Response } from "express";
import { runAgentLoop } from "@terminus/core";
import { userMessageValidation } from "../validation/chat.validation.js";
import { config } from "../config/config.js";

export async function chatController(req: Request, res: Response) {
  const parsed = userMessageValidation.safeParse(req.body);
  if (!parsed.success) {
    const error = parsed.error.flatten((e) => e.message).fieldErrors;
    return res.status(400).json({ message: "invalid request", error });
  }

  const { message: userMessage } = parsed.data;

  res.setHeader("Access-Control-Allow-Origin", config.ALLOWED_ORIGIN);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for await (const event of runAgentLoop(userMessage, {
      provider: config.PROVIDER,
      apiKey: config.API_KEY,
      modelId: config.MODEL_ID,
      workingDir: config.WORKING_DIR,
      maxIterations: config.MAX_ITERATIONS,
    })) {
      send(event);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    send({ type: "error", message, errorType: "agent_loop" });
  } finally {
    res.end();
  }
}
