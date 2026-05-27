# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (also type-checks)
npm run start    # Start production server
npm run lint     # ESLint
npm run eval     # Verdict regression suite — agents 1–3 on all 5 golden claims (~$0.01 with Haiku)
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

- **Server** (`app/api/agent/route.ts`): calls `client.messages.stream()` from `@anthropic-ai/sdk`, pipes `text` events into a `ReadableStream`, closes on `finalMessage()`. `maxDuration = 60` caps the Vercel function at 60 s.
- **Retry logic**: retries up to 3 times on `APIError` status 529 or 500, with exponential backoff starting at 1 s. A `hasSentBytes` flag guards against retrying after partial output. On final failure before any bytes are sent, the stream closes with a JSON sentinel `{"__streamError":true,"error":"...","agentId":N}`.
- **Client** (`app/page.tsx`): reads chunks via `ReadableStream.getReader()`. `streamAgent()` detects the `__streamError` sentinel and returns `null`, which triggers the error card state on that specific agent without crashing the pipeline.

The `streamAgent()` helper encapsulates the stream-read loop. `runAgent(agentId)` wraps it for agents 1–3. `runAgent4()` fires both letter and memo sub-tasks simultaneously.

### Zod Schemas (`lib/schemas.ts`)

All inter-agent data contracts are defined as Zod schemas. These are the canonical source of truth for shape validation:

- `AgentRequestBodySchema` — validates the `/api/agent` POST body; replaces the previous manual field checks in the route. The `body` variable is typed as `unknown` and always goes through `safeParse` before destructuring.
- `PreviousOutputsSchema` — the `{ intake?, investigation?, decision? }` object that passes context between agents.
- `VerdictOutputSchema` — the typed contract for Agent 3's output `{ verdict: 'Approve'|'Investigate'|'Deny', confidence: 0–100 }`. `parseVerdictFromOutput()` in `lib/prompts.ts` still uses regex to extract values from free text, but then validates the extracted shape through this schema via `safeParse` before returning. A validation failure logs a warning and returns a safe default rather than crashing.

### Prompt System (`lib/prompts.ts`)

- Each agent has a dedicated system prompt and a `buildAgentNUser()` function that injects prior context.
- `buildAgentPrompt(agentId, claimText, previousOutputs, subTask?)` is the single factory used by the API route.
- `parseVerdictFromOutput()` extracts `VERDICT` and `CONFIDENCE` via regex, then validates through `VerdictOutputSchema`.

### PDF Extraction (`app/api/extract-pdf/route.ts`)

Accepts `{ pdfBase64: string }`, calls Claude Haiku's document API (not the streaming agent route), and returns `{ text: string }`. The Anthropic SDK's TypeScript types don't expose the `document` block yet — the call is cast via `as any`.

### Data Flow

```
User input (textarea / sample claim / uploaded file)
  → [PDF only] POST /api/extract-pdf { pdfBase64 } → Claude Haiku → { text }
  → POST /api/agent { claimText, agentId, subTask?, previousOutputs }
  → Zod validates request body
  → Claude streams response
  → chunks accumulated in outputsRef[agentId]
  → on completion, next agent starts (or Agent 4 parallel tasks)
  → Agent 3 output parsed + Zod-validated → verdict/confidence
  → final case saved to localStorage via lib/caseHistory.ts (max 50 entries)
```

The queue UI (`ClaimQueue.tsx`) is display-only — only one claim processes at a time.

### Key Files

- `app/page.tsx` — pipeline orchestration, all agent state, streaming loop
- `app/api/agent/route.ts` — server-side Claude call; Zod request validation; per-agent `max_tokens` (1500 for 1/2/4, 1200 for 3)
- `app/api/extract-pdf/route.ts` — PDF text extraction via Claude Haiku document API
- `lib/schemas.ts` — Zod schemas: `AgentRequestBodySchema`, `PreviousOutputsSchema`, `VerdictOutputSchema`
- `lib/prompts.ts` — all system prompts and user message builders
- `lib/types.ts` — `AgentState`, `CompletedCase`, `Verdict`, `QueuedClaim`
- `lib/tracing.ts` — LangSmith tracing; `traceClaude()` is fire-and-forget (no-op when `LANGSMITH_API_KEY` is absent)
- `lib/evals/goldenDataset.ts` — 5 labelled eval entries (expected verdict, risk level, rationale)
- `scripts/runEvals.ts` — eval runner: Haiku model, 5 s inter-agent delay, 15 s inter-claim delay, progress messages
- `lib/sampleClaims.ts` — 5 sample claims with varying risk levels for testing
- `lib/caseHistory.ts` — localStorage persistence; permanent stats (`claimiq_perm_stats`) never reset on history clear
- `components/AgentCard.tsx` — live-streaming card with tabbed output for Agent 4
- `components/FinalReport.tsx` — post-pipeline report with 5-tab view of all outputs

### Model

All Claude calls (main pipeline + eval runner) use `claude-haiku-4-5-20251001`. Model IDs are set directly in their respective files (`app/api/agent/route.ts`, `scripts/runEvals.ts`). PDF extraction also uses Haiku (`app/api/extract-pdf/route.ts`).

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
