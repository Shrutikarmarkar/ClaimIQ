'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown, ChevronUp, CheckCircle2, Search, XCircle, Clock } from 'lucide-react';
import { CompletedCase, Verdict } from '@/lib/types';
import { clearCaseHistory } from '@/lib/caseHistory';

interface HistoryModalProps {
  cases: CompletedCase[];
  onClose: () => void;
  onClear: () => void;
}

const VERDICT_STYLES: Record<Verdict, { icon: React.ReactNode; text: string; bg: string; border: string }> = {
  Approve: {
    icon: <CheckCircle2 size={11} className="text-emerald-600" />,
    text: 'text-emerald-700',
    bg:   'bg-emerald-50',
    border: 'border-emerald-200',
  },
  Investigate: {
    icon: <Search size={11} className="text-amber-600" />,
    text: 'text-amber-700',
    bg:   'bg-amber-50',
    border: 'border-amber-200',
  },
  Deny: {
    icon: <XCircle size={11} className="text-red-600" />,
    text: 'text-red-700',
    bg:   'bg-red-50',
    border: 'border-red-200',
  },
};

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function CaseCard({ c, index }: { c: CompletedCase; index: number }) {
  const [expanded, setExpanded]   = useState(false);
  const [activeTab, setActiveTab] = useState<keyof CompletedCase['agentOutputs']>('intake');
  const vs = VERDICT_STYLES[c.verdict];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-cream-200 bg-white overflow-hidden hover:border-cream-400 transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 transition-colors text-left"
      >
        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0', vs.bg, vs.border)}>
          {vs.icon}
          <span className={cn('text-[10px] font-mono font-semibold tracking-wider', vs.text)}>
            {c.verdict.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-cream-800 truncate font-semibold">{c.claimLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={9} className="text-cream-500" />
            <span className="text-[10px] text-cream-600 font-mono">{formatDate(c.completedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', vs.text.replace('text-', 'bg-'))}
              style={{ width: `${c.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-cream-500 font-mono w-8">{c.confidence}%</span>
        </div>

        {expanded
          ? <ChevronUp size={12} className="text-cream-600 shrink-0" />
          : <ChevronDown size={12} className="text-cream-600 shrink-0" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-cream-100"
          >
            <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
              {(Object.keys(c.agentOutputs) as Array<keyof CompletedCase['agentOutputs']>).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-mono capitalize whitespace-nowrap transition-all',
                    activeTab === tab
                      ? 'bg-cream-900 text-white'
                      : 'text-cream-600 hover:text-cream-700 border border-cream-200',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4">
              <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-cream-600 max-h-56 overflow-y-auto">
                {c.agentOutputs[activeTab] || 'No output recorded.'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryModal({ cases, onClose, onClear }: HistoryModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-cream-900/30 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-3xl bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-cream-900" />
            <h2 className="font-display text-xl tracking-wide text-cream-900 uppercase leading-none">
              Case History
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-100 text-cream-500 font-mono border border-cream-200">
              {cases.length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {cases.length > 0 && (
              <button
                onClick={() => { clearCaseHistory(); onClear(); }}
                className="flex items-center gap-1.5 text-[11px] text-cream-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={11} /> Clear All
              </button>
            )}
            <button onClick={onClose} className="text-cream-600 hover:text-cream-900 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {cases.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[10px] text-cream-600 font-mono tracking-[0.18em] uppercase">
                No case history yet — process a claim to begin
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cases.map((c, i) => (
                <CaseCard key={c.id} c={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
