/* 
every time browser ask something to server , the server do a chain 
of processes to generate the final response .. we cant just make the user
wait till the response is generating .. we will notify each chian processes 
which here are called events , these events will be shared b/w
server and the browser so that th euser could know okay , this and
that is happening , the agent stared .. first turn happed , text delta generated
turn 2 started , result is showcased , agent stopped
*/

// events that the PROVIDER emits (Anthropic, Gemini, etc.)
// these come from the LLM stream
export type ProviderEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> };

// events that the AGENT LOOP emits
// these come from your control logic, not the LLM
export type AgentEvent =
  | { type: "agent_start" }
  | { type: "turn_start"; turn: number }
  | { type: "tool_end"; name: string; result: string; isError: boolean }
  | { type: "turn_end"; turn: number; durationMs: number }
  | { type: "agent_end" }
  | { type: "error"; message: string; errorType: string };

// everything the browser can receive over SSE
// = both combined
export type SSEEvent = ProviderEvent | AgentEvent;
