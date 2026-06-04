# Terminus

A minimal coding agent harness built from scratch to understand how agentic systems work under the hood.

Terminus accepts a natural language task, runs an agent loop powered by Anthropic Claude or Google Gemini, executes real tools on your machine (bash, read_file, write_file, list_dir), and streams every step live to your terminal.

No magic. No LangChain. No abstractions you didn't write yourself.

---

## What this teaches you

| Concept | Where it lives |
|---|---|
| SSE from LLM to your server | `packages/core/src/providers/` |
| The agent loop (while + break) | `packages/core/src/loop.ts` |
| Tool calling mechanics | `packages/core/src/tools/` |
| Context accumulation across turns | `packages/core/src/loop.ts` |
| CLI command structure | `apps/cli/src/commands/` |
| Provider + model management | `apps/cli/src/utils/config.ts` |

---

## Architecture

```
terminus agent -p "add cookie auth to app.ts"
     │
     ▼
apps/cli — Commander.js entry point
     │
     │  reads provider + api key from ~/.terminus/config.json
     │  passes opts to core
     │
     ▼
packages/core — runAgentLoop()
     │
     ├── Agent Loop  (while true)
     │     builds context.messages
     │     calls Provider Layer
     │     receives AssistantMessage
     │     checks for tool calls
     │     ├── tool calls found →
     │     │     dispatches to Tools
     │     │     wraps result as ToolResultMessage
     │     │     pushes into context.messages
     │     │     loops again
     │     └── no tool calls →
     │           breaks loop
     │           streams final answer
     │
     ├── Provider Layer
     │     anthropic.ts — translates messages → Anthropic format, streams via SDK
     │     gemini.ts    — translates messages → Gemini format, streams via SDK
     │     index.ts     — picks provider based on opts.provider
     │
     └── Tools
           bash         → child_process.exec()
           read_file    → fs.readFile()
           write_file   → fs.writeFile()
           list_dir     → fs.readdir()
     │
     ▼
Anthropic / Gemini API  (external, SSE response)
```

### The SSE connection

```
Anthropic / Gemini API  ──SSE──►  packages/core provider layer
```

One SSE connection — from the LLM to your machine. Text deltas stream live to your terminal as the model generates them. Tool calls arrive complete, get executed locally, and results feed back into the next LLM call.

### context.messages — the agent's memory

There is no database. There is no session store. The agent's entire memory is a single array that grows every turn and is sent in full on every LLM call.

```
Turn 1 sends:
  [{ role: "user", content: "add cookie auth" }]

Turn 2 sends:
  [{ role: "user",       content: "add cookie auth"         }]
  [{ role: "assistant",  toolCall: { name: "read_file" }    }]
  [{ role: "toolResult", content: "import express..."       }]

Turn 3 sends:
  [{ role: "user",       content: "add cookie auth"         }]
  [{ role: "assistant",  toolCall: { name: "read_file" }    }]
  [{ role: "toolResult", content: "import express..."       }]
  [{ role: "assistant",  toolCall: { name: "write_file" }   }]
  [{ role: "toolResult", content: "file written"            }]
```

The LLM is stateless. context.messages IS the memory.

---

## Folder structure

```
terminus/
│
├── apps/
│   ├── cli/                              Commander.js CLI
│   │   └── src/
│   │       ├── commands/
│   │       │   ├── agent.ts              terminus agent -p "..."
│   │       │   ├── models.ts             terminus models
│   │       │   └── providers/
│   │       │       ├── index.ts          terminus providers
│   │       │       ├── login.ts          terminus providers login
│   │       │       ├── logout.ts         terminus providers logout
│   │       │       ├── list.ts           terminus providers list
│   │       │       └── setProvider.ts    terminus providers set
│   │       ├── utils/
│   │       │   └── config.ts             reads/writes ~/.terminus/config.json
│   │       └── index.ts                  entry point
│   │
│   └── api/                              Express backend (web chat product)
│       └── src/
│           ├── controllers/
│           │   └── chat.controller.ts    SSE endpoint — proxies core to browser
│           ├── routes/
│           │   └── chatRoutes.ts         POST /api/v1/chat
│           ├── validation/
│           │   └── chat.validation.ts    Zod schema
│           ├── config/
│           │   └── config.ts             env vars
│           └── index.ts                  Express server entry point
│
├── packages/
│   ├── core/                             shared agent brain
│   │   └── src/
│   │       ├── providers/
│   │       │   ├── anthropic.ts          Anthropic SSE streaming
│   │       │   ├── gemini.ts             Gemini SSE streaming
│   │       │   └── index.ts              provider dispatcher
│   │       ├── tools/
│   │       │   ├── bash.ts               bash tool
│   │       │   ├── read-file.ts          read_file tool
│   │       │   ├── write-file.ts         write_file tool
│   │       │   ├── list-dir.ts           list_dir tool
│   │       │   └── index.ts              tool registry + factory
│   │       ├── loop.ts                   the while(true) agent loop
│   │       ├── types.ts                  shared types (Message, Tool, CoreConfig)
│   │       └── index.ts                  re-exports everything
│   │
│   └── shared/                           SSE event types
│       └── src/
│           └── events.ts                 ProviderEvent + AgentEvent + SSEEvent
│
├── turbo.json
├── package.json                          root workspace (Bun)
├── .gitignore
└── README.md
```

---

## SSE event schema

```typescript
// emitted by the provider layer (from the LLM)
type ProviderEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> }

// emitted by the agent loop (your control logic)
type AgentEvent =
  | { type: "agent_start" }
  | { type: "turn_start";  turn: number }
  | { type: "tool_end";    name: string; result: string; isError: boolean }
  | { type: "turn_end";    turn: number; durationMs: number }
  | { type: "agent_end" }
  | { type: "error";       message: string; errorType: string }

// everything the CLI (or browser) can receive
type SSEEvent = ProviderEvent | AgentEvent
```

---

## CLI usage

### Setup

```bash
# install dependencies
bun install

# login to a provider
terminus providers login --provider claude --api-key sk-ant-...
terminus providers login --provider gemini --api-key AIza...

# set active provider
terminus providers set claude

# check available models
terminus models
```

### Run the agent

```bash
# basic task
terminus agent -p "list all files in the current directory"

# coding task
terminus agent -p "read package.json and list all dependencies"

# specify working directory
terminus agent -p "find all TODO comments" --cwd /path/to/your/project

# limit turns
terminus agent -p "refactor this function" --max-iterations 10
```

### Provider management

```bash
terminus providers list
terminus providers login --provider gemini --api-key AIza...
terminus providers logout --provider gemini
terminus providers set anthropic
```

---

## Running locally

```bash
# install all workspace dependencies
bun install

# run the CLI in dev mode
cd apps/cli
bun run dev -- agent -p "your task here"

# run the API server (for web chat)
cd apps/api
bun run dev
```

---

## How a request flows — step by step

```
1. terminus agent -p "add cookie auth to app.ts"

2. CLI reads activeProvider + apiKey from ~/.terminus/config.json

3. CLI calls runAgentLoop("add cookie auth", { provider, apiKey, modelId, workingDir })

4. Agent loop builds context.messages = [{ role: "user", content: "add cookie auth" }]
   Emits: agent_start

5. Loop calls streamProvider() — picks anthropic.ts or gemini.ts based on provider
   Provider opens HTTP POST + SSE connection to LLM API
   Emits: turn_start { turn: 1 }

6. LLM streams back text → text_delta events → printed live to terminal

7. LLM returns: toolCall { name: "read_file", args: { path: "app.ts" } }
   Provider emits: tool_start { name: "read_file", args }

8. Loop executes read_file tool locally
   fs.readFile("app.ts") → returns file contents
   Emits: tool_end { name: "read_file", result: "import express..." }

9. Loop pushes ToolResultMessage into context.messages
   Calls LLM again with full updated context
   Emits: turn_start { turn: 2 }

10. Eventually LLM returns no tool calls — final answer streams live
    Loop exits
    Emits: agent_end
```

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Monorepo | Turborepo + Bun | Fast installs, parallel task running |
| CLI | Commander.js + Chalk | Minimal, battle-tested CLI framework |
| Agent core | TypeScript (no framework) | You control everything |
| Providers | Anthropic SDK + Google GenAI SDK | Official SDKs, SSE streaming |
| API server | Express + TypeScript | Simple HTTP layer for web product |
| Types | Shared package | Single source of truth for event types |

---

## What is NOT in this project

- No database — context.messages lives in memory per request
- No session persistence — each agent run starts fresh
- No LangChain, no LlamaIndex, no agent frameworks
- No WebSockets — SSE is sufficient for one-directional streaming
- No auth — local dev tool

---

## Inspiration

Architecture inspired by studying [Pi](https://github.com/earendil-works/pi) — an open source coding agent. Terminus is a deliberately minimal reimplementation for learning purposes, without Pi's multi-provider abstraction, TUI, session management, or extension system.