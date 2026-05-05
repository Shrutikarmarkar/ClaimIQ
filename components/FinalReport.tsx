'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Search, XCircle, ChevronRight } from 'lucide-react';
import { AgentState, Verdict } from '@/lib/types';

interface FinalReportProps {
  agents: AgentState[];
  verdict: Verdict | null;
  confidence: number;
}

const VERDICT_CONFIG = {
  Approve: {
    label: 'APPROVED',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    glow: 'verdict-approve',
    ring: '#16A34A',
    trackStroke: 'rgba(22,163,74,0.15)',
  },
  Investigate: {
    label: 'INVESTIGATE',
    icon: Search,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
    glow: 'verdict-investigate',
    ring: '#D97706',
    trackStroke: 'rgba(217,119,6,0.15)',
  },
  Deny: {
    label: 'DENIED',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconBg: 'bg-red-100',
    glow: 'verdict-deny',
    ring: '#DC2626',
    trackStroke: 'rgba(220,38,38,0.15)',
  },
};

type TabId = 'intake' | 'investigation' | 'decision' | 'letter' | 'memo';

const TABS: { id: TabId; label: string; agentId: number }[] = [
  { id: 'intake',        label: 'Intake',        agentId: 1 },
  { id: 'investigation', label: 'Investigation',  agentId: 2 },
  { id: 'decision',      label: 'Decision',       agentId: 3 },
  { id: 'letter',        label: 'Letter',         agentId: 4 },
  { id: 'memo',          label: 'Memo',           agentId: 4 },
];

function ConfidenceRing({
  confidence,
  color,
  trackStroke,
}: {
  confidence: number;
  color: string;
  trackStroke: string;
}) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90 w-full h-full">
        <circle cx="40" cy="40" r={r} fill="none" stroke={trackStroke} strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
        />
      </svg>
      <div className="text-center z-10">
        <motion.span
          className="text-xl font-black text-cream-900 block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {confidence}
        </motion.span>
        <span className="text-[9px] text-cream-600 font-mono">%</span>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function FinalReport({ agents, verdict, confidence }: FinalReportProps) {
  const [activeTab, setActiveTab] = useState<TabId>('intake');
  if (!verdict) return null;

  const cfg  = VERDICT_CONFIG[verdict];
  const Icon = cfg.icon;

  const getTabContent = (tabId: TabId): string => {
    switch (tabId) {
      case 'intake':        return agents.find(a => a.id === 1)?.output        ?? '';
      case 'investigation': return agents.find(a => a.id === 2)?.output        ?? '';
      case 'decision':      return agents.find(a => a.id === 3)?.output        ?? '';
      case 'letter':        return agents.find(a => a.id === 4)?.letterOutput  ?? '';
      case 'memo':          return agents.find(a => a.id === 4)?.memoOutput    ?? '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      className="mt-10"
    >
      {/* Verdict banner */}
      <div className={cn('rounded-2xl border p-6 mb-4', cfg.bg, cfg.border, cfg.glow)}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border', cfg.iconBg, cfg.border)}
            >
              <Icon size={26} className={cfg.text} />
            </motion.div>

            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] text-cream-600 font-mono tracking-widest uppercase mb-1"
              >
                Final Verdict
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className={cn('font-display text-5xl tracking-wide leading-none', cfg.text)}
              >
                {cfg.label}
              </motion.h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-cream-600 font-mono tracking-wider uppercase">Confidence</p>
              <p className="text-xs text-cream-600 mt-1">AI Decision Score</p>
            </div>
            <ConfidenceRing confidence={confidence} color={cfg.ring} trackStroke={cfg.trackStroke} />
          </div>
        </div>
      </div>

      {/* Report tabs */}
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        <div className="flex border-b border-cream-200 bg-cream-50 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-all duration-200 border-b-2',
                activeTab === tab.id
                  ? 'text-cream-900 border-cream-900 bg-white'
                  : 'text-cream-600 border-transparent hover:text-cream-700 hover:bg-cream-100/50',
              )}
            >
              <span className="text-[10px] font-mono text-cream-500 mr-0.5">0{tab.agentId}</span>
              {tab.label}
              {i < TABS.length - 1 && (
                <ChevronRight size={10} className="text-cream-200 ml-1" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-cream-700 max-h-72 overflow-y-auto">
            {getTabContent(activeTab) || 'No output available.'}
          </pre>
        </div>
      </div>

      <p className="text-[10px] text-cream-500 text-center mt-3 font-mono tracking-wider">
        Report automatically saved to case history
      </p>
    </motion.div>
  );
}
