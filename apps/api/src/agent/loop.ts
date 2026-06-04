import { streamAnthropic } from "../providers/anthropic.js";
import { findTool, toolSchemas } from "./tools/index.js";
import { config } from "../config/config.js";
import type { AgentEvent, ProviderEvent, SSEEvent } from "@terminus/shared";
import type { Message } from "../providers/anthropic.js";

const SYSTEM_PROMPT = `You are Terminus, an expert coding agent.
You have access to tools to read files, write files, run bash commands, and explore directories.
When given a task:
1. Start by exploring the structure with list_dir
2. Read relevant files with read_file
3. Make changes with write_file or bash
4. Verify with bash (run tests, compile, etc.)
5. Report what you did concisely
Working directory: ${config.WORKING_DIR}`;

export async function* runAgentLoop(
  userMessage: string,
): AsyncGenerator<SSEEvent> {
  const messages: Message[] = [{ role: "user", content: userMessage }];

  let turn = 0;

  yield { type: "agent_start" };

  while (turn < config.MAX_ITERATIONS) {
    turn++;
    const turnStart = Date.now();

    yield { type: "turn_start", turn };

    // collect what the LLM wants to do this turn
    const toolCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }> = [];
    let assistantText = "";

    // stream from Anthropic — only yields text_delta and tool_start
    for await (const event of streamAnthropic(
      SYSTEM_PROMPT,
      messages,
      toolSchemas,
    )) {
      // forward provider events directly to the browser
      yield event;

      // also track locally so we can build the assistant message
      if (event.type === "text_delta") {
        assistantText += event.delta;
      }
      if (event.type === "tool_start") {
        toolCalls.push({
          id: `tool_${Date.now()}_${toolCalls.length}`,
          name: event.name,
          args: event.args,
        });
      }
    }

    // push assistant message into history
    messages.push({
      role: "assistant",
      text: assistantText,
      toolCalls,
    });

    // no tool calls = LLM is done, break the loop
    if (toolCalls.length === 0) {
      yield { type: "turn_end", turn, durationMs: Date.now() - turnStart };
      break;
    }

    // execute each tool call
    for (const tc of toolCalls) {
      const tool = findTool(tc.name);

      if (!tool) {
        // unknown tool — tell the LLM
        yield {
          type: "tool_end",
          name: tc.name,
          result: `Unknown tool: ${tc.name}`,
          isError: true,
        };
        messages.push({
          role: "toolResult",
          toolCallId: tc.id,
          toolName: tc.name,
          result: `Unknown tool: ${tc.name}`,
          isError: true,
        });
        continue;
      }

      // run the tool
      const { result, isError } = await tool.execute(tc.args);

      // emit tool_end so browser knows what happened
      yield { type: "tool_end", name: tc.name, result, isError };

      // push result into conversation history so LLM sees it next turn
      messages.push({
        role: "toolResult",
        toolCallId: tc.id,
        toolName: tc.name,
        result,
        isError,
      });
    }

    yield { type: "turn_end", turn, durationMs: Date.now() - turnStart };

    // loop continues — LLM will be called again with updated messages
  }

  yield { type: "agent_end" };
}
