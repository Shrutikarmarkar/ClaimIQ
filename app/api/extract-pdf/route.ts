import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { traceClaude } from '@/lib/tracing';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { pdfBase64: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pdfBase64 } = body;
  if (!pdfBase64) {
    return Response.json({ error: 'Missing pdfBase64' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const startTime = Date.now();
    const extractPrompt = 'Extract all the text content from this document. Return only the extracted text, preserving the structure and formatting as closely as possible.';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: extractPrompt },
        ],
      }],
    });

    const text = (response.content as Array<{ type: string; text?: string }>)
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('\n');

    traceClaude({
      agentId: 0,
      model: 'claude-haiku-4-5-20251001',
      system: '',
      userPrompt: extractPrompt,
      response: text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - startTime,
    });

    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Anthropic.APIError
      ? `Anthropic API error ${err.status}: ${err.message}`
      : err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
