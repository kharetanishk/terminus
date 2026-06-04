import { useState, useCallback, useRef } from "react";
import type { SSEEvent } from "@terminus/shared";

export interface AgentMessage {
  id: string;
  type: "text" | "tool_start" | "tool_end" | "status";
  content: string;
  toolName?: string;
  isError?: boolean;
  turn?: number;
}

export interface AgentState {
  messages: AgentMessage[];
  running: boolean;
  error: string | null;
  currentText: string;
  turn: number;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function useAgentStream() {
  const [state, setState] = useState<AgentState>({
    messages: [],
    running: false,
    error: null,
    currentText: "",
    turn: 0,
  });

  const abortRef = useRef<AbortController | null>(null);

  const pushMessage = (msg: Omit<AgentMessage, "id">) => {
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { ...msg, id: `${Date.now()}-${Math.random()}` },
      ],
    }));
  };

  const run = useCallback(async (userMessage: string) => {
    // reset state
    setState({
      messages: [],
      running: true,
      error: null,
      currentText: "",
      turn: 0,
    });

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          // handle each event type
          switch (event.type) {
            case "agent_start":
              pushMessage({ type: "status", content: "Agent started" });
              break;

            case "turn_start":
              setState((prev) => ({ ...prev, turn: event.turn }));
              pushMessage({
                type: "status",
                content: `Turn ${event.turn}`,
                turn: event.turn,
              });
              currentText = "";
              break;

            case "text_delta":
              // accumulate text — append each delta
              currentText += event.delta;
              setState((prev) => ({ ...prev, currentText }));
              break;

            case "tool_start":
              // flush any accumulated text before showing tool
              if (currentText.trim()) {
                pushMessage({ type: "text", content: currentText });
                currentText = "";
                setState((prev) => ({ ...prev, currentText: "" }));
              }
              pushMessage({
                type: "tool_start",
                content: JSON.stringify(event.args, null, 2),
                toolName: event.name,
              });
              break;

            case "tool_end":
              pushMessage({
                type: "tool_end",
                content: event.result,
                toolName: event.name,
                isError: event.isError,
              });
              break;

            case "turn_end":
              // flush remaining text
              if (currentText.trim()) {
                pushMessage({ type: "text", content: currentText });
                currentText = "";
                setState((prev) => ({ ...prev, currentText: "" }));
              }
              break;

            case "agent_end":
              setState((prev) => ({
                ...prev,
                running: false,
                currentText: "",
              }));
              break;

            case "error":
              setState((prev) => ({
                ...prev,
                running: false,
                error: event.message,
              }));
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        running: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, running: false }));
  }, []);

  return { state, run, stop };
}
