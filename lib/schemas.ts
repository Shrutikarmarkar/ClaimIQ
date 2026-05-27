import { z } from 'zod';

// ── Inter-agent contract: what passes as previousOutputs ──────────────────
export const PreviousOutputsSchema = z.object({
  intake:        z.string().optional(),
  investigation: z.string().optional(),
  decision:      z.string().optional(),
});

// ── /api/agent request body ───────────────────────────────────────────────
export const AgentRequestBodySchema = z.object({
  claimText:       z.string().min(1),
  agentId:         z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  subTask:         z.enum(['letter', 'memo']).optional(),
  previousOutputs: PreviousOutputsSchema.default({}),
});

// ── Agent 3 structured verdict output ────────────────────────────────────
// This is the schema that parseVerdictFromOutput() validates against,
// replacing the raw-regex approach with a typed, validated contract.
export const VerdictOutputSchema = z.object({
  verdict:    z.enum(['Approve', 'Investigate', 'Deny']),
  confidence: z.number().int().min(0).max(100),
});

export type VerdictOutput = z.infer<typeof VerdictOutputSchema>;
