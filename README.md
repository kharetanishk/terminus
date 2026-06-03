# Terminus

A minimal coding agent harness built from scratch to understand how agentic systems work under the hood.

Terminus accepts a natural language task, runs an agent loop powered by Google Gemini, executes real tools on your machine (bash, read_file, write_file, list_dir), and streams every step back to the browser in real time via Server-Sent Events.

No magic. No LangChain. No abstractions you didn't write yourself.

---

## What this teaches you

| Concept                           | Where it lives                         |
| --------------------------------- | -------------------------------------- |
| SSE from LLM to your server       | `apps/api/src/providers/gemini.ts`     |
| SSE from your server to browser   | `apps/api/src/routes/chat.ts`          |
| The agent loop (while + break)    | `apps/api/src/agent/loop.ts`           |
| Tool calling mechanics            | `apps/api/src/agent/tools/`            |
| Context accumulation across turns | `apps/api/src/agent/loop.ts`           |
| Streaming UI with React           | `apps/web/src/components/Terminal.tsx` |

---

## Architecture

```
Browser (React + Vite)
    │
    │  POST /api/chat  { message: string }
    │  ← SSE stream    data: { type, payload }
    │
    ▼
Express Backend (apps/api)
    │
    ├── POST /api/chat
    │     receives message
    │     opens SSE response to browser
    │     starts agent loop
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
    │           final answer streamed to browser
    │
    ├── Provider Layer  (gemini.ts)
    │     translates context.messages → Gemini JSON format
    │     translates tool schemas → functionDeclarations
    │     opens HTTP POST to api.google.com
    │     receives SSE stream from Gemini
    │     parses chunks → typed events
    │     forwards events to agent loop
    │
    └── Tools
          bash         → child_process.exec()
          read_file    → fs.readFile()
          write_file   → fs.writeFile()
          list_dir     → fs.readdir()
    │
    ▼
Google Gemini API  (external, SSE response)
```

### The two SSE connections

```
Gemini API  ──SSE──►  Express backend   (SSE connection #1)
Express     ──SSE──►  React browser     (SSE connection #2)
```

The backend sits in the middle — consuming Gemini's SSE stream and forwarding parsed events to the browser in real time. Every text delta, every tool execution, every result appears in the UI the moment it happens.

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
│   ├── api/                          Express backend
│   │   ├── src/
│   │   │   ├── agent/
│   │   │   │   ├── loop.ts           The while(true) agent loop
│   │   │   │   ├── tools/
│   │   │   │   │   ├── index.ts      Tool registry
│   │   │   │   │   ├── bash.ts       bash tool
│   │   │   │   │   ├── read-file.ts  read_file tool
│   │   │   │   │   ├── write-file.ts write_file tool
│   │   │   │   │   └── list-dir.ts   list_dir tool
│   │   │   │   └── types.ts          Agent-level types
│   │   │   ├── providers/
│   │   │   │   └── gemini.ts         Gemini SSE streaming + format conversion
│   │   │   ├── routes/
│   │   │   │   └── chat.ts           POST /api/chat — SSE endpoint
│   │   │   ├── config.ts             Env vars, constants
│   │   │   └── index.ts              Express server entry point
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── Terminal.tsx      Main streaming output component
│       │   │   ├── MessageInput.tsx  Task input box
│       │   │   └── EventBlock.tsx    Renders one agent event (text, tool, result)
│       │   ├── hooks/
│       │   │   └── useAgentStream.ts Manages SSE connection + event state
│       │   ├── types.ts              Shared event types (mirrored from api)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                       Types shared between api and web
│       ├── src/
│       │   └── events.ts             SSE event types used by both sides
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                Runs api + web together
├── docker-compose.dev.yml            Dev mode with hot reload
├── turbo.json                        Turborepo pipeline config
├── package.json                      Root workspace config (Bun)
├── .env.example                      Root env template
├── .gitignore
└── README.md
```

---

## SSE event schema

Every event sent from Express to the browser follows this shape:

```typescript
type SSEEvent =
  | { type: "agent_start" }
  | { type: "turn_start"; turn: number }
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: string; isError: boolean }
  | { type: "turn_end" }
  | { type: "agent_end" }
  | { type: "error"; message: string };
```

On the wire each event looks like:

```
data: {"type":"agent_start"}

data: {"type":"turn_start","turn":1}

data: {"type":"text_delta","delta":"I'll read"}

data: {"type":"text_delta","delta":" the file first"}

data: {"type":"tool_start","name":"read_file","args":{"path":"app.ts"}}

data: {"type":"tool_result","name":"read_file","result":"import express...","isError":false}

data: {"type":"agent_end"}
```

---

## Environment variables

### apps/api/.env

```
# Required
GEMINI_API_KEY=your_key_here

# Optional
PORT=3001
MODEL_ID=gemini-2.0-flash
MAX_ITERATIONS=50
WORKING_DIR=/workspace
```

### apps/web/.env

```
VITE_API_URL=http://localhost:3001
```

---

## Running locally

### Without Docker

```bash
# Install dependencies
bun install

# Start both api and web in parallel
bun run dev
```

### With Docker Compose

```bash
# Copy env files
cp apps/api/.env.example apps/api/.env
# Add your GEMINI_API_KEY to apps/api/.env

# Start everything
docker-compose -f docker-compose.dev.yml up
```

Web runs at `http://localhost:5173`
API runs at `http://localhost:3001`

---

## How a request flows — step by step

```
1. User types "add cookie auth to app.ts" in the browser

2. React calls POST /api/chat with { message: "add cookie auth to app.ts" }
   The response is kept open as an SSE stream

3. Express starts the agent loop
   Emits: data: {"type":"agent_start"}

4. Agent loop builds initial context.messages with the user message
   Emits: data: {"type":"turn_start","turn":1}

5. Provider layer translates context.messages → Gemini JSON
   Opens HTTP POST to api.google.com
   Gemini starts streaming back (SSE connection #1)

6. Gemini returns: toolCall { name: "read_file", args: { path: "app.ts" } }
   Express forwards to browser:
     data: {"type":"tool_start","name":"read_file","args":{"path":"app.ts"}}

7. Agent loop executes read_file tool
   fs.readFile("app.ts") → returns file contents

8. Agent loop pushes ToolResultMessage into context.messages
   Express forwards to browser:
     data: {"type":"tool_result","name":"read_file","result":"import express...","isError":false}

9. Agent loop calls Gemini again with the full updated context.messages
   Emits: data: {"type":"turn_start","turn":2}

10. Gemini returns: toolCall { name: "write_file", ... }
    Agent executes, pushes result, loops again

11. Gemini returns no tool calls — final text answer
    Each token streams to browser:
      data: {"type":"text_delta","delta":"I've added"}
      data: {"type":"text_delta","delta":" cookie auth..."}

12. Agent loop exits
    Express closes the SSE stream:
      data: {"type":"agent_end"}
```

---

## Docker setup

### docker-compose.dev.yml (development)

```yaml
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    volumes:
      - ./apps/api/src:/app/src # hot reload
      - /workspace:/workspace # agent working directory
    env_file:
      - ./apps/api/.env
    environment:
      - NODE_ENV=development

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./apps/web/src:/app/src # hot reload
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - api
```

The `/workspace` volume is the directory the agent operates in. Mount whatever codebase you want the agent to work on there.

---

## Tech stack

| Layer     | Technology              | Why                                            |
| --------- | ----------------------- | ---------------------------------------------- |
| Monorepo  | Turborepo + Bun         | Fast installs, parallel task running           |
| Backend   | Express + TypeScript    | Minimal, you control everything                |
| Frontend  | React + Vite            | Fast dev server, no framework magic hiding SSE |
| LLM       | Google Gemini 2.0 Flash | Fast, free tier available, good tool calling   |
| Streaming | Server-Sent Events      | One-directional, perfect for agent output      |
| Infra     | Docker Compose          | Reproducible local environment                 |
| Types     | Shared package          | Single source of truth for SSE event types     |

---

## What is NOT in this project

- No database — context.messages lives in memory per request
- No auth — this is a local dev tool
- No session persistence — each request starts fresh
- No LangChain, no LlamaIndex, no agent frameworks
- No WebSockets — SSE is sufficient for one-directional streaming

---

## Inspiration

Architecture inspired by studying [Pi](https://github.com/earendil-works/pi) — an open source coding agent. Terminus is a deliberately minimal reimplementation for learning purposes, without Pi's multi-provider abstraction, TUI, session management, or extension system.
