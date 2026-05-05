'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ClaimQueue from '@/components/ClaimQueue';
import AgentPipeline from '@/components/AgentPipeline';
import FinalReport from '@/components/FinalReport';
import CaseHistory from '@/components/CaseHistory';
import HistoryModal from '@/components/HistoryModal';
import { AgentState, SampleClaim, QueuedClaim, CompletedCase, Verdict, NavStats, AgentId } from '@/lib/types';
import { SAMPLE_CLAIMS } from '@/lib/sampleClaims';
import { parseVerdictFromOutput } from '@/lib/prompts';
import { saveCaseToHistory, getCaseHistory, getPermanentStats, recordPermanentCase } from '@/lib/caseHistory';
import { type DuplicateWarning } from '@/components/ClaimQueue';

const INITIAL_AGENTS: AgentState[] = [
  { id: 1, name: 'INTAKE AGENT',        tagline: 'Extracting & structuring claim data',       status: 'idle', output: '', letterOutput: '', memoOutput: '', letterStatus: 'idle', memoStatus: 'idle' },
  { id: 2, name: 'INVESTIGATION AGENT', tagline: 'Running 4 fraud detection checks',           status: 'idle', output: '', letterOutput: '', memoOutput: '', letterStatus: 'idle', memoStatus: 'idle' },
  { id: 3, name: 'DECISION AGENT',      tagline: 'Applying business rules & rendering verdict',status: 'idle', output: '', letterOutput: '', memoOutput: '', letterStatus: 'idle', memoStatus: 'idle' },
  { id: 4, name: 'COMMUNICATION AGENT', tagline: 'Drafting claimant letter & adjuster memo',   status: 'idle', output: '', letterOutput: '', memoOutput: '', letterStatus: 'idle', memoStatus: 'idle' },
];

async function streamAgent(
  claimText: string,
  agentId: AgentId,
  previousOutputs: { intake?: string; investigation?: string; decision?: string },
  subTask?: 'letter' | 'memo',
  onChunk?: (chunk: string) => void,
): Promise<string | null> {
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimText, agentId, subTask, previousOutputs }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onChunk?.(accumulated);
    }
    return accumulated;
  } catch (err) {
    console.error(`Agent ${agentId} error:`, err);
    return null;
  }
}

export default function Home() {
  const [claimText, setClaimText]             = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [queue, setQueue]                     = useState<QueuedClaim[]>([]);
  const [agents, setAgents]                   = useState<AgentState[]>(INITIAL_AGENTS);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [isComplete, setIsComplete]           = useState(false);
  const [verdict, setVerdict]                 = useState<Verdict | null>(null);
  const [confidence, setConfidence]           = useState(0);
  const [caseHistory, setCaseHistory]         = useState<CompletedCase[]>([]);
  const [stats, setStats]                     = useState<NavStats>({ processed: 0, approvalRate: 0, avgConfidence: 0 });
  const [showHistoryModal, setShowHistoryModal]   = useState(false);
  const [duplicateWarning, setDuplicateWarning]   = useState<DuplicateWarning | null>(null);

  const outputsRef = useRef<{ intake: string; investigation: string; decision: string }>({ intake: '', investigation: '', decision: '' });

  useEffect(() => {
    setCaseHistory(getCaseHistory());
    refreshStats();
  }, []);

  function refreshStats() {
    const s = getPermanentStats();
    if (s.processed === 0) { setStats({ processed: 0, approvalRate: 0, avgConfidence: 0 }); return; }
    setStats({
      processed:    s.processed,
      approvalRate: Math.round((s.approvals / s.processed) * 100),
      avgConfidence: Math.round(s.totalConfidence / s.processed),
    });
  }

  function getClaimLabel(text: string): string {
    const sample = SAMPLE_CLAIMS.find(c => c.id === selectedClaimId);
    if (sample) return sample.label;
    const snippet = text.trim().replace(/\s+/g, ' ').slice(0, 60);
    return snippet + (text.trim().length > 60 ? '…' : '');
  }

  function handleSelectClaim(claim: SampleClaim) {
    setSelectedClaimId(claim.id);
    setClaimText(claim.text);
    setDuplicateWarning(null);
  }

  function resetPipeline() {
    outputsRef.current = { intake: '', investigation: '', decision: '' };
    setAgents(INITIAL_AGENTS);
    setIsComplete(false);
    setVerdict(null);
    setConfidence(0);
  }

  function updateAgentOutput(agentId: AgentId, output: string) {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, output } : a));
  }

  function setAgentStatus(agentId: AgentId, status: AgentState['status']) {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status } : a));
  }

  async function runAgent(agentId: AgentId): Promise<string | null> {
    setAgentStatus(agentId, 'streaming');
    const result = await streamAgent(claimText, agentId, outputsRef.current, undefined,
      (acc) => updateAgentOutput(agentId, acc));
    if (result === null) { setAgentStatus(agentId, 'error'); return null; }
    if (agentId === 1) outputsRef.current.intake       = result;
    if (agentId === 2) outputsRef.current.investigation = result;
    if (agentId === 3) outputsRef.current.decision     = result;
    setAgentStatus(agentId, 'done');
    return result;
  }

  async function runAgent4(): Promise<{ letter: string | null; memo: string | null }> {
    setAgents(prev => prev.map(a => a.id === 4 ? { ...a, status: 'streaming', letterStatus: 'streaming', memoStatus: 'streaming' } : a));
    let letterResult: string | null = null;
    let memoResult:   string | null = null;

    const letterPromise = streamAgent(claimText, 4, outputsRef.current, 'letter',
      (acc) => setAgents(prev => prev.map(a => a.id === 4 ? { ...a, letterOutput: acc } : a))
    ).then(r => { letterResult = r; setAgents(prev => prev.map(a => a.id === 4 ? { ...a, letterStatus: r !== null ? 'done' : 'error' } : a)); });

    const memoPromise = streamAgent(claimText, 4, outputsRef.current, 'memo',
      (acc) => setAgents(prev => prev.map(a => a.id === 4 ? { ...a, memoOutput: acc } : a))
    ).then(r => { memoResult = r; setAgents(prev => prev.map(a => a.id === 4 ? { ...a, memoStatus: r !== null ? 'done' : 'error' } : a)); });

    await Promise.all([letterPromise, memoPromise]);
    setAgentStatus(4, letterResult !== null && memoResult !== null ? 'done' : 'error');
    return { letter: letterResult, memo: memoResult };
  }

  async function handleProcessClaim(skipDuplicateCheck = false) {
    if (!claimText.trim() || isProcessing) return;

    const claimLabel   = getClaimLabel(claimText);
    const existingCase = caseHistory.find(c => c.claimLabel === claimLabel);

    if (!skipDuplicateCheck && existingCase) {
      setDuplicateWarning({ existingCase });
      return;
    }

    setDuplicateWarning(null);
    resetPipeline();
    setIsProcessing(true);

    const queueId = crypto.randomUUID();
    setQueue(prev => [...prev, { id: queueId, text: claimText, label: claimLabel, status: 'processing', submittedAt: new Date().toISOString() }]);

    const a1 = await runAgent(1); if (!a1) { setIsProcessing(false); updateQueueItem(queueId, 'error'); return; }
    const a2 = await runAgent(2); if (!a2) { setIsProcessing(false); updateQueueItem(queueId, 'error'); return; }
    const a3 = await runAgent(3); if (!a3) { setIsProcessing(false); updateQueueItem(queueId, 'error'); return; }

    const { verdict: v, confidence: c } = parseVerdictFromOutput(a3);
    setVerdict(v); setConfidence(c);

    const { letter, memo } = await runAgent4();

    const completedCase: CompletedCase = {
      id: crypto.randomUUID(), claimLabel,
      completedAt: new Date().toISOString(),
      verdict: v, confidence: c,
      agentOutputs: { intake: outputsRef.current.intake, investigation: outputsRef.current.investigation, decision: outputsRef.current.decision, letter: letter ?? '', memo: memo ?? '' },
    };

    saveCaseToHistory(completedCase);
    recordPermanentCase(v, c);
    setCaseHistory(getCaseHistory());
    refreshStats();
    updateQueueItem(queueId, 'done');
    setIsComplete(true);
    setIsProcessing(false);

    document.getElementById('pipeline-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateQueueItem(id: string, status: QueuedClaim['status']) {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar stats={stats} onOpenHistory={() => setShowHistoryModal(true)} />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-cream-900 overflow-hidden">
        {/* Subtle noise grain */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '300px 300px' }}
        />
        {/* Radial glow top-left */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-600/[0.04] blur-3xl pointer-events-none" />

        <div className="max-w-[1600px] mx-auto px-6 py-24 sm:py-32 text-center relative">
          <motion.p
            className="font-mono text-[10px] text-white/60 tracking-[0.35em] uppercase mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            Powered by Multi-Agent AI
          </motion.p>

          <div className="overflow-hidden">
            <motion.h1
              className="font-display text-[clamp(3.5rem,9.5vw,9rem)] leading-[0.88] text-white uppercase tracking-wide"
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              Insurance Claims<br />Intelligence
            </motion.h1>
          </div>

          <motion.p
            className="mt-7 text-white/65 font-mono text-[11px] tracking-[0.22em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            4-Agent AI Pipeline · Live Fraud Detection · Automated Adjudication
          </motion.p>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <button
              onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-10 py-3.5 rounded-full border border-white/20 text-white font-display text-xl tracking-[0.12em] uppercase hover:bg-white hover:text-cream-900 transition-all duration-300"
            >
              Start Processing
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <section id="process" className="bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-cream-200">

            {/* LEFT — Claim Input */}
            <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0 px-6 py-10">
              <SectionHeader title="Claim Input" subtitle="Select a sample or paste your own" />
              <div className="sticky top-[3.75rem] pt-2 max-h-[calc(100vh-5rem)] overflow-y-auto pb-10">
                <ClaimQueue
                  sampleClaims={SAMPLE_CLAIMS}
                  selectedClaimId={selectedClaimId}
                  claimText={claimText}
                  isProcessing={isProcessing}
                  queue={queue}
                  onSelectClaim={handleSelectClaim}
                  onChangeText={(text) => {
                    setClaimText(text);
                    setDuplicateWarning(null);
                    if (selectedClaimId && text !== SAMPLE_CLAIMS.find(c => c.id === selectedClaimId)?.text)
                      setSelectedClaimId(null);
                  }}
                  onProcess={handleProcessClaim}
                  duplicateWarning={duplicateWarning}
                  onDismissDuplicate={() => setDuplicateWarning(null)}
                  onProcessAnyway={() => handleProcessClaim(true)}
                />
              </div>
            </div>

            {/* RIGHT — Agent Pipeline */}
            <div className="flex-1 min-w-0 px-6 py-10" id="pipeline-results">
              <SectionHeader title="Agent Pipeline" subtitle="4-stage sequential AI processing" />
              <AgentPipeline agents={agents} isProcessing={isProcessing} isComplete={isComplete} />
              <AnimatePresence>
                {isComplete && verdict && (
                  <FinalReport agents={agents} verdict={verdict} confidence={confidence} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── CASE HISTORY ─────────────────────────────────────────── */}
      <section className="bg-cream-100 border-t border-cream-200">
        <div className="max-w-[1600px] mx-auto px-6 py-10">
          <SectionHeader title="Case History" subtitle="All previously processed claims" />
          <CaseHistory
            cases={caseHistory}
            onClear={() => setCaseHistory([])}
          />
        </div>
      </section>

      {/* History modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <HistoryModal
            cases={caseHistory}
            onClose={() => setShowHistoryModal(false)}
            onClear={() => { setCaseHistory([]); setShowHistoryModal(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] text-cream-900 uppercase tracking-wide leading-none">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 font-mono text-[11px] text-cream-600 tracking-[0.18em] uppercase">{subtitle}</p>
      )}
      <div className="mt-4 h-px bg-cream-200" />
    </div>
  );
}
