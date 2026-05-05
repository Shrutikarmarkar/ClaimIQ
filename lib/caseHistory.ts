import { CompletedCase } from './types';

const HISTORY_KEY   = 'claimiq_case_history';
const PERM_STATS_KEY = 'claimiq_perm_stats';

interface PermStats {
  processed:       number;
  approvals:       number;
  totalConfidence: number;
}

// ─── Case history ─────────────────────────────────────────────

export function saveCaseToHistory(completedCase: CompletedCase): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = [completedCase, ...getCaseHistory()].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch { /* localStorage unavailable */ }
}

export function getCaseHistory(): CompletedCase[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as CompletedCase[]) : [];
  } catch { return []; }
}

export function clearCaseHistory(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

// ─── Permanent stats (never reset on clear) ───────────────────

export function getPermanentStats(): PermStats {
  if (typeof window === 'undefined') return { processed: 0, approvals: 0, totalConfidence: 0 };
  try {
    const raw = localStorage.getItem(PERM_STATS_KEY);
    return raw ? JSON.parse(raw) : { processed: 0, approvals: 0, totalConfidence: 0 };
  } catch { return { processed: 0, approvals: 0, totalConfidence: 0 }; }
}

export function recordPermanentCase(verdict: string, confidence: number): void {
  if (typeof window === 'undefined') return;
  try {
    const s = getPermanentStats();
    localStorage.setItem(PERM_STATS_KEY, JSON.stringify({
      processed:       s.processed + 1,
      approvals:       s.approvals + (verdict === 'Approve' ? 1 : 0),
      totalConfidence: s.totalConfidence + confidence,
    }));
  } catch { /* ignore */ }
}
