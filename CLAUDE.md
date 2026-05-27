# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (also type-checks)
npm run start    # Start production server
npm run lint     # ESLint
```

Requires `.env.local` with `ANTHROPIC_API_KEY` (see `.env.local.example`).

```bash
npm run eval     # Run verdict regression suite against all 5 golden claims (calls Claude directly, costs ~$0.10)
```

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

- **Server** (`app/api/agent/route.ts`): calls `client.messages.stream()` from `@anthropic-ai/sdk`, pipes `text` events into a `ReadableStream`, closes on `finalMessage()`. `maxDuration = 60` caps the Vercel function at 60 s — raising it requires a Vercel plan that supports longer timeouts.
- **Client** (`app/page.tsx`): reads the stream via `ReadableStream.getReader()`, decodes chunks, and passes the accumulated string to an `onChunk` callback that updates React state live.

The `streamAgent()` helper in `app/page.tsx` encapsulates this pattern. `runAgent(agentId)` wraps it for agents 1–3. `runAgent4()` fires both letter and memo sub-tasks simultaneously.

### Prompt System (`lib/prompts.ts`)

- Each agent has a dedicated system prompt and a `buildAgentNUser()` function that injects prior context.
- `buildAgentPrompt(agentId, claimText, previousOutputs, subTask?)` is the single factory used by the API route.
- `parseVerdictFromOutput()` uses regex to extract `VERDICT` and `CONFIDENCE` from Agent 3's raw text.

### PDF Extraction (`app/api/extract-pdf/route.ts`)

Accepts `{ pdfBase64: string }`, calls Claude Haiku's document API (not the streaming agent route), and returns `{ text: string }`. Used as a pre-processing step before the main pipeline. The Anthropic SDK's TypeScript types don't expose the `document` block yet — the call is cast via `as any`.

### Data Flow

```
User input (textarea / sample claim / uploaded file)
  → [PDF only] POST /api/extract-pdf { pdfBase64 } → Claude Haiku → { text }
  → POST /api/agent { claimText, agentId, subTask?, previousOutputs }
  → Claude streams response
  → chunks accumulated in outputsRef[agentId]
  → on completion, next agent starts (or Agent 4 parallel tasks)
  → final case saved to localStorage via lib/caseHistory.ts (max 50 entries)
```

The queue UI (`ClaimQueue.tsx`) is display-only — only one claim processes at a time. Items are added to the queue array when a run starts and updated to `done`/`error` on completion; there is no real background queuing.

### Key Files

- `app/page.tsx` — pipeline orchestration, all agent state, streaming loop
- `app/api/agent/route.ts` — server-side Claude call; sets per-agent `max_tokens` (1500 for 1/2/4, 1200 for 3)
- `app/api/extract-pdf/route.ts` — PDF text extraction via Claude Haiku document API
- `lib/prompts.ts` — all system prompts and user message builders
- `lib/types.ts` — `AgentState`, `CompletedCase`, `Verdict`, `QueuedClaim`
- `lib/tracing.ts` — LangSmith tracing; `traceClaude()` is fire-and-forget (no-op when `LANGSMITH_API_KEY` is absent)
- `lib/evals/goldenDataset.ts` — 5 labelled eval entries (expected verdict, risk level, rationale); imports claim text from `sampleClaims.ts` to avoid duplication
- `scripts/runEvals.ts` — eval runner: calls agents 1–3 directly via the Anthropic SDK, compares verdicts, exits non-zero on any failure
- `lib/sampleClaims.ts` — 5 sample claims with varying risk levels for testing
- `lib/caseHistory.ts` — localStorage persistence helpers; permanent stats (`claimiq_perm_stats`) never reset on history clear
- `components/AgentCard.tsx` — live-streaming card with tabbed output for Agent 4
- `components/FinalReport.tsx` — post-pipeline report with 5-tab view of all outputs

### Model

Main pipeline uses `claude-sonnet-4-6`. PDF extraction uses `claude-haiku-4-5-20251001`. Both model IDs are set directly in their respective API route files.

## Styling & Design System

Tailwind is extended with a custom `cream` color scale (off-white to near-black) defined in `tailwind.config.js`. Always use `cream-*` tokens for neutrals — do not reach for Tailwind's default `gray`/`slate`/`zinc` scales.

```
cream-50  → #FAFAF8   (page background)
cream-100 → #F7F5F1   (section backgrounds, input fills)
cream-200 → #EEEAE2   (borders, dividers)
cream-600 → #6B6258   (secondary text)
cream-900 → #171412   (primary text, active states, hero background)
```

Two font families are registered:
- `font-sans` → Inter (body text)
- `font-display` → Bebas Neue (headings, buttons, labels)

Each component defines its own local `cn(...classes)` helper inline rather than from a shared utility. When adding new components, keep this pattern.

## Observability

LangSmith tracing is wired into both API routes via `lib/tracing.ts`. Each Claude call emits an `llm` run tagged with `agent_id`, `sub_task` (Agent 4 only: `letter` or `memo`), and `latency_ms`. The PDF extraction route traces as `agentId: 0`.

Runs are sent to the project named by `LANGSMITH_PROJECT` (defaults to `claimiq`). If `LANGSMITH_API_KEY` is not set, tracing is entirely skipped with zero overhead.

## Deployment

Deployed on Vercel. To redeploy after changes:

```bash
vercel --prod
```

`ANTHROPIC_API_KEY` is set as a Vercel environment variable (production). Do not commit `.env.local`.
