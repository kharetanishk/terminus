import { Request, Response } from "express";
import { userMessageValidation } from "../validation/chat.validation.js";
import { runAgentLoop } from "../agent/loop.js";

export async function chatController(req: Request, res: Response) {
  const parsed = userMessageValidation.safeParse(req.body);
  if (!parsed.success) {
    const error = parsed.error.flatten((e) => e.message).fieldErrors;
    return res.status(400).json({ message: "invalid request", error });
  }

  const { message: userMessage } = parsed.data;

  // open SSE connection to the browser
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // run agent loop and forward every event to the browser
    for await (const event of runAgentLoop(userMessage)) {
      send(event);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    send({ type: "error", message, errorType: "agent_loop" });
  } finally {
    res.end();
  }
}
