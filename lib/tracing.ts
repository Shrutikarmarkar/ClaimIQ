import { Client } from 'langsmith';

let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.LANGSMITH_API_KEY) return null;
  if (!_client) {
    _client = new Client({ apiKey: process.env.LANGSMITH_API_KEY });
  }
  return _client;
}

export interface TraceClaudeOpts {
  agentId: number;
  subTask?: 'letter' | 'memo';
  model: string;
  system: string;
  userPrompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export function traceClaude(opts: TraceClaudeOpts): void {
  const client = getClient();
  if (!client) return;

  const project = process.env.LANGSMITH_PROJECT ?? 'claimiq';
  const runName = opts.subTask
    ? `Agent ${opts.agentId} — ${opts.subTask}`
    : `Agent ${opts.agentId}`;

  // Fire-and-forget: never await, never throw to caller
  client
    .createRun({
      name: runName,
      run_type: 'llm',
      project_name: project,
      inputs: {
        system: opts.system,
        messages: [{ role: 'user', content: opts.userPrompt }],
        model: opts.model,
      },
      outputs: {
        response: opts.response,
        usage: {
          input_tokens: opts.inputTokens,
          output_tokens: opts.outputTokens,
        },
      },
      extra: {
        metadata: {
          agent_id: opts.agentId,
          sub_task: opts.subTask ?? null,
          latency_ms: opts.latencyMs,
        },
      },
    })
    .catch(() => {
      // Tracing failures are silent — pipeline must continue
    });
}
