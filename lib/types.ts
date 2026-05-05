export type AgentId = 1 | 2 | 3 | 4;
export type AgentStatus = 'idle' | 'streaming' | 'done' | 'error';
export type Verdict = 'Approve' | 'Investigate' | 'Deny';
export type RiskLevel = 'LOW' | 'LOW-MEDIUM' | 'MEDIUM' | 'HIGH';

export interface AgentState {
  id: AgentId;
  name: string;
  tagline: string;
  status: AgentStatus;
  output: string;
  letterOutput: string;
  memoOutput: string;
  letterStatus: AgentStatus;
  memoStatus: AgentStatus;
}

export interface SampleClaim {
  id: string;
  label: string;
  type: string;
  amount: string;
  riskLevel: RiskLevel;
  text: string;
}

export interface QueuedClaim {
  id: string;
  text: string;
  label: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  submittedAt: string;
}

export interface CompletedCase {
  id: string;
  claimLabel: string;
  completedAt: string;
  verdict: Verdict;
  confidence: number;
  agentOutputs: {
    intake: string;
    investigation: string;
    decision: string;
    letter: string;
    memo: string;
  };
}

export interface AgentRequestBody {
  claimText: string;
  agentId: AgentId;
  subTask?: 'letter' | 'memo';
  previousOutputs: {
    intake?: string;
    investigation?: string;
    decision?: string;
  };
}

export interface ParsedVerdict {
  verdict: Verdict;
  confidence: number;
}

export interface NavStats {
  processed: number;
  approvalRate: number;
  avgConfidence: number;
}
