import type { SSEEvent } from "@terminus/shared";
import type { Message, CoreConfig } from "./types.js";
import { streamProvider } from "./providers/index.js";
import { createTools, findTool } from "./tools/index.js";

const DEFAULT_SYSTEM_PROMPT = (workingDir: string) =>
  `You are Terminus, an expert coding agent.
You have access to tools to read files, write files, run bash commands, and explore directories.
When given a task:
1. Start by exploring the structure with list_dir
2. Read relevant files with read_file
3. Make changes with write_file or bash
4. Verify with bash (run tests, compile, etc.)
5. Report what you did concisely
Working directory: ${workingDir}`;

export async function* runAgentLoop(
  userMessage: string,
  opts: CoreConfig,
): AsyncGenerator<SSEEvent> {
  const systemPrompt =
    opts.systemPrompt ?? DEFAULT_SYSTEM_PROMPT(opts.workingDir);

  const tools = createTools();
  const messages: Message[] = [{ role: "user", content: userMessage }];
  let turn = 0;

  yield { type: "agent_start" };

  while (turn < opts.maxIterations) {
    turn++;
    const turnStart = Date.now();

    yield { type: "turn_start", turn };

    const toolCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }> = [];
    let assistantText = "";

    for await (const event of streamProvider(systemPrompt, messages, tools.map((t) => t.schema), opts)) {
      yield event;

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

    messages.push({
      role: "assistant",
      text: assistantText,
      toolCalls,
    });

    if (toolCalls.length === 0) {
      yield { type: "turn_end", turn, durationMs: Date.now() - turnStart };
      break;
    }

    for (const tc of toolCalls) {
      const tool = findTool(tools, tc.name);

      if (!tool) {
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

      const { result, isError } = await tool.execute(tc.args, opts.workingDir);

      yield { type: "tool_end", name: tc.name, result, isError };

      messages.push({
        role: "toolResult",
        toolCallId: tc.id,
        toolName: tc.name,
        result,
        isError,
      });
    }

    yield { type: "turn_end", turn, durationMs: Date.now() - turnStart };
  }

  yield { type: "agent_end" };
}
