import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { buildAgentPrompt } from '@/lib/prompts';
import { AgentRequestBody, AgentId } from '@/lib/types';
import { traceClaude } from '@/lib/tracing';

export const maxDuration = 60;

const MAX_TOKENS: Record<AgentId, number> = {
  1: 1500,
  2: 1500,
  3: 1200,
  4: 1500,
};

export async function POST(req: NextRequest) {
  let body: AgentRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { claimText, agentId, subTask, previousOutputs } = body;

  if (!claimText || !agentId || agentId < 1 || agentId > 4) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid fields: claimText, agentId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

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
      try {
        const claudeStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: MAX_TOKENS[agentId as AgentId],
          system,
          messages: [{ role: 'user', content: user }],
        });

        let fullResponse = '';
        claudeStream.on('text', (delta: string) => {
          fullResponse += delta;
          controller.enqueue(encoder.encode(delta));
        });

        const finalMsg = await claudeStream.finalMessage();
        controller.close();

        traceClaude({
          agentId,
          subTask,
          model: 'claude-sonnet-4-6',
          system,
          userPrompt: user,
          response: fullResponse,
          inputTokens: finalMsg.usage.input_tokens,
          outputTokens: finalMsg.usage.output_tokens,
          latencyMs: Date.now() - startTime,
        });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Anthropic API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown streaming error';
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${message}]`));
        controller.close();
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
