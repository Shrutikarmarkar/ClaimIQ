import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { buildAgentPrompt } from '@/lib/prompts';
import { AgentId } from '@/lib/types';
import { traceClaude } from '@/lib/tracing';
import { AgentRequestBodySchema } from '@/lib/schemas';

export const maxDuration = 60;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function isRetryable(err: unknown): boolean {
  return err instanceof Anthropic.APIError && (err.status === 529 || err.status === 500);
}

function errorMessage(err: unknown): string {
  return err instanceof Anthropic.APIError
    ? `API ${err.status}: ${err.message}`
    : err instanceof Error ? err.message : 'Unknown error';
}

const MAX_TOKENS: Record<AgentId, number> = {
  1: 1500,
  2: 1500,
  3: 1200,
  4: 1500,
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = AgentRequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request body', details: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const { claimText, agentId, subTask, previousOutputs } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const client = new Anthropic({ apiKey });
  const { system, user } = buildAgentPrompt(
    agentId as AgentId,
    claimText,
    previousOutputs ?? {},
    subTask,
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();
      let hasSentBytes = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
        }

        try {
          const claudeStream = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: MAX_TOKENS[agentId as AgentId],
            system,
            messages: [{ role: 'user', content: user }],
          });

          let fullResponse = '';
          claudeStream.on('text', (delta: string) => {
            hasSentBytes = true;
            fullResponse += delta;
            controller.enqueue(encoder.encode(delta));
          });

          const finalMsg = await claudeStream.finalMessage();
          controller.close();

          traceClaude({
            agentId,
            subTask,
            model: 'claude-haiku-4-5-20251001',
            system,
            userPrompt: user,
            response: fullResponse,
            inputTokens: finalMsg.usage.input_tokens,
            outputTokens: finalMsg.usage.output_tokens,
            latencyMs: Date.now() - startTime,
          });
          return;

        } catch (err) {
          // If partial output was already sent we can't retry — emit inline error marker
          if (hasSentBytes) {
            controller.enqueue(encoder.encode(`\n\n[ERROR: ${errorMessage(err)}]`));
            controller.close();
            return;
          }

          // Retry on 529 (overloaded) or 500 while attempts remain
          if (isRetryable(err) && attempt < MAX_RETRIES) continue;

          // Final failure — emit structured JSON so the client can distinguish
          // this from a partial content response and show the error card state
          controller.enqueue(encoder.encode(
            JSON.stringify({ __streamError: true, error: errorMessage(err), agentId }),
          ));
          controller.close();
          return;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
