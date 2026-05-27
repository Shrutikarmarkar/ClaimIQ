/**
 * Regression eval harness for the ClaimIQ agent pipeline.
 *
 * Runs agents 1–3 on each golden-dataset entry and compares the actual
 * verdict from Agent 3 against the expected verdict.
 *
 * Usage:
 *   npm run eval
 *   ANTHROPIC_API_KEY=sk-... npm run eval
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildAgentPrompt, parseVerdictFromOutput } from '../lib/prompts';
import { GOLDEN_DATASET, EvalEntry } from '../lib/evals/goldenDataset';
import { AgentId, Verdict } from '../lib/types';

const MAX_TOKENS: Record<1 | 2 | 3, number> = { 1: 1500, 2: 1500, 3: 1200 };

// Haiku is sufficient for regression testing and ~20x cheaper than Sonnet
const MODEL = 'claude-haiku-4-5-20251001';

// Delays to stay under the 30k input-tokens-per-minute rate limit
const INTER_AGENT_DELAY_MS  = 5_000;   // between Agent 1→2, 2→3 within a claim
const INTER_CLAIM_DELAY_MS  = 15_000;  // between each of the 5 claims

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function callAgent(
  client: Anthropic,
  agentId: 1 | 2 | 3,
  claimText: string,
  previousOutputs: { intake?: string; investigation?: string },
): Promise<string> {
  const { system, user } = buildAgentPrompt(agentId as AgentId, claimText, previousOutputs);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS[agentId],
    system,
    messages: [{ role: 'user', content: user }],
  });
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}

interface EvalResult {
  label: string;
  expected: Verdict;
  actual: Verdict;
  confidence: number;
  pass: boolean;
  error?: string;
}

async function evalEntry(client: Anthropic, entry: EvalEntry): Promise<EvalResult> {
  try {
    const intake = await callAgent(client, 1, entry.claimText, {});

    console.log(`   ⏳ Waiting ${INTER_AGENT_DELAY_MS / 1000}s before Agent 2 (rate-limit buffer)...`);
    await sleep(INTER_AGENT_DELAY_MS);
    const investigation = await callAgent(client, 2, entry.claimText, { intake });

    console.log(`   ⏳ Waiting ${INTER_AGENT_DELAY_MS / 1000}s before Agent 3 (rate-limit buffer)...`);
    await sleep(INTER_AGENT_DELAY_MS);
    const decision = await callAgent(client, 3, entry.claimText, { intake, investigation });

    const { verdict: actual, confidence } = parseVerdictFromOutput(decision);
    return {
      label: entry.label,
      expected: entry.expectedVerdict,
      actual,
      confidence,
      pass: actual === entry.expectedVerdict,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { label: entry.label, expected: entry.expectedVerdict, actual: 'Investigate', confidence: 0, pass: false, error };
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const total = GOLDEN_DATASET.length;

  console.log(`\nClaimIQ Eval Harness — ${total} claims, model: ${MODEL}`);
  console.log(`Delays: ${INTER_AGENT_DELAY_MS / 1000}s between agents, ${INTER_CLAIM_DELAY_MS / 1000}s between claims`);
  console.log('━'.repeat(60));

  const results: EvalResult[] = [];

  for (let i = 0; i < total; i++) {
    const entry = GOLDEN_DATASET[i];
    console.log(`\n[${i + 1}/${total}] ${entry.label}`);

    const result = await evalEntry(client, entry);
    results.push(result);

    if (result.error) {
      console.log(`   ✗  ERROR — ${result.error}`);
    } else {
      const icon   = result.pass ? '✓' : '✗';
      const detail = result.pass
        ? `${result.actual} (${result.confidence}%)`
        : `expected ${result.expected}, got ${result.actual} (${result.confidence}%)`;
      console.log(`   ${icon}  ${detail}`);
    }

    if (i < total - 1) {
      console.log(`\n⏳ Waiting ${INTER_CLAIM_DELAY_MS / 1000}s before next claim (rate-limit buffer)...`);
      await sleep(INTER_CLAIM_DELAY_MS);
    }
  }

  const passed   = results.filter(r => r.pass).length;
  const errored  = results.filter(r => r.error).length;
  const accuracy = Math.round((passed / results.length) * 100);

  console.log('\n' + '━'.repeat(60));
  console.log(`Passed  : ${passed}/${results.length}`);
  if (errored > 0) console.log(`Errors  : ${errored}`);
  console.log(`Accuracy: ${accuracy}%`);

  if (passed < results.length) {
    console.log('\nFailed cases:');
    results
      .filter(r => !r.pass)
      .forEach(r => {
        if (r.error) {
          console.log(`  • ${r.label} — ERROR: ${r.error}`);
        } else {
          console.log(`  • ${r.label} — expected ${r.expected}, got ${r.actual} (${r.confidence}%)`);
        }
      });
  }

  process.exit(passed === results.length ? 0 : 1);
}

main();
