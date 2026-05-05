'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, Search, XCircle, Trash2, Clock } from 'lucide-react';
import { CompletedCase, Verdict } from '@/lib/types';
import { clearCaseHistory } from '@/lib/caseHistory';

interface CaseHistoryProps {
  cases: CompletedCase[];
  onClear: () => void;
}

const VERDICT_STYLES: Record<Verdict, { icon: React.ReactNode; text: string; bg: string; border: string }> = {
  Approve:     { icon: <CheckCircle2 size={11} className="text-emerald-600" />, text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Investigate: { icon: <Search      size={11} className="text-amber-600" />,   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  Deny:        { icon: <XCircle     size={11} className="text-red-600" />,     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
};

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function CaseCard({ c, index }: { c: CompletedCase; index: number }) {
  const [expanded, setExpanded]   = useState(false);
  const [activeTab, setActiveTab] = useState<keyof CompletedCase['agentOutputs']>('intake');
  const vs = VERDICT_STYLES[c.verdict];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -1 }}
      className="rounded-2xl border border-cream-200 bg-white overflow-hidden hover:border-cream-400 hover:shadow-sm transition-all duration-200"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0', vs.bg, vs.border)}>
          {vs.icon}
          <span className={cn('text-[10px] font-display tracking-wider', vs.text)}>
            {c.verdict.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-cream-900 truncate font-semibold">{c.claimLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={9} className="text-cream-500" />
            <span className="text-[10px] text-cream-600 font-mono">{formatDate(c.completedAt)}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="w-20 h-1.5 bg-cream-200 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', vs.text.replace('text-', 'bg-'))} style={{ width: `${c.confidence}%` }} />
          </div>
          <span className="text-xs font-bold text-cream-700 w-10 text-right">{c.confidence}%</span>
        </div>

        {expanded ? <ChevronUp size={14} className="text-cream-600 shrink-0" /> : <ChevronDown size={14} className="text-cream-600 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-cream-100"
          >
            <div className="flex gap-1.5 px-5 pt-4 overflow-x-auto">
              {(Object.keys(c.agentOutputs) as Array<keyof CompletedCase['agentOutputs']>).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[10px] font-display tracking-wider capitalize whitespace-nowrap uppercase transition-all',
                    activeTab === tab ? 'bg-cream-900 text-white' : 'text-cream-600 border border-cream-200 hover:border-cream-600 hover:text-cream-700',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-5">
              <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-cream-600 max-h-52 overflow-y-auto">
                {c.agentOutputs[activeTab] || 'No output recorded.'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CaseHistory({ cases, onClear }: CaseHistoryProps) {
  if (cases.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 rounded-2xl border-2 border-dashed border-cream-200">
        <p className="text-[11px] text-cream-600 font-mono tracking-[0.2em] uppercase">
          No case history yet — process a claim to begin
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px] text-cream-600 tracking-wider">
          {cases.length} {cases.length === 1 ? 'case' : 'cases'} processed
        </span>
        <button
          onClick={() => { clearCaseHistory(); onClear(); }}
          className="flex items-center gap-1.5 text-[11px] text-cream-600 hover:text-red-500 transition-colors font-mono"
        >
          <Trash2 size={11} /> Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cases.map((c, i) => <CaseCard key={c.id} c={c} index={i} />)}
      </div>
    </div>
  );
}
