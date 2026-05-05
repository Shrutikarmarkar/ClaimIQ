# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

Requires `.env.local` with `ANTHROPIC_API_KEY` (see `.env.local.example`).

## Architecture

ClaimIQ is a Next.js 14 App Router app that runs insurance claims through a sequential 4-agent Claude pipeline with real-time streaming output.

### Agent Pipeline

Agents run in order; each receives the accumulated outputs of all prior agents as context via `outputsRef` in `app/page.tsx`.

| Agent | Role | Key output |
|-------|------|-----------|
| 1 — Intake | Structures raw claim text | Claimant profile, financial details, narrative |
| 2 — Investigation | Fraud detection (4 checks) | LOW/MEDIUM/HIGH severity per check |
| 3 — Decision | Applies business rules | VERDICT (Approve/Investigate/Deny) + CONFIDENCE % |
| 4 — Communication | Drafts two documents in **parallel** | Customer letter + internal adjuster memo |

Agent 4 is the only one that runs parallel sub-tasks (`Promise.all`). All other agents are strictly sequential.

### Streaming

- **Server** (`app/api/agent/route.ts`): calls `client.messages.stream()` from `@anthropic-ai/sdk`, pipes `text` events into a `ReadableStream`, closes on `finalMessage()`.
- **Client** (`app/page.tsx`): reads the stream via `ReadableStream.getReader()`, decodes chunks, and passes the accumulated string to an `onChunk` callback that updates React state live.

The `streamAgent()` helper in `app/page.tsx` encapsulates this pattern. `runAgent(agentId)` wraps it for agents 1–3. `runAgent4()` fires both letter and memo sub-tasks simultaneously.

### Prompt System (`lib/prompts.ts`)

- Each agent has a dedicated system prompt and a `buildAgentNUser()` function that injects prior context.
- `buildAgentPrompt(agentId, claimText, previousOutputs, subTask?)` is the single factory used by the API route.
- `parseVerdictFromOutput()` uses regex to extract `VERDICT` and `CONFIDENCE` from Agent 3's raw text.

### Data Flow

```
User input (textarea / sample claim)
  → POST /api/agent { claimText, agentId, subTask?, previousOutputs }
  → Claude streams response
  → chunks accumulated in outputsRef[agentId]
  → on completion, next agent starts (or Agent 4 parallel tasks)
  → final case saved to localStorage via lib/caseHistory.ts (max 50 entries)
```

### Key Files

- `app/page.tsx` — pipeline orchestration, all agent state, streaming loop
- `app/api/agent/route.ts` — server-side Claude call; sets per-agent `max_tokens` (1500 for 1/2/4, 1200 for 3)
- `lib/prompts.ts` — all system prompts and user message builders
- `lib/types.ts` — `AgentState`, `CompletedCase`, `Verdict`, `QueuedClaim`
- `lib/sampleClaims.ts` — 5 sample claims with varying risk levels for testing
- `lib/caseHistory.ts` — localStorage persistence helpers
- `components/AgentCard.tsx` — live-streaming card with tabbed output for Agent 4
- `components/FinalReport.tsx` — post-pipeline report with 5-tab view of all outputs

### Model

Uses `claude-sonnet-4-6`. The model ID is set directly in `app/api/agent/route.ts`.
