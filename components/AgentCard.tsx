'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Clock, Loader2,
  ChevronDown, ChevronUp, Mail, FileText,
} from 'lucide-react';
import { AgentState, AgentId } from '@/lib/types';

const AGENT_GRADIENT: Record<AgentId, string> = {
  1: 'from-blue-500   to-blue-700',
  2: 'from-violet-500 to-violet-700',
  3: 'from-amber-500  to-amber-700',
  4: 'from-emerald-500 to-emerald-700',
};

const AGENT_GLOW: Record<AgentId, string> = {
  1: 'rgba(59,  130, 246, 0.14)',
  2: 'rgba(124, 58,  237, 0.14)',
  3: 'rgba(245, 158,  11, 0.14)',
  4: 'rgba(16,  185, 129, 0.14)',
};

const AGENT_ACCENT: Record<AgentId, string> = {
  1: 'text-blue-600',
  2: 'text-violet-600',
  3: 'text-amber-600',
  4: 'text-emerald-600',
};

interface AgentCardProps {
  agent: AgentState;
  index: number;
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AgentCard({ agent, index }: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'letter' | 'memo'>('letter');
  const outputRef = useRef<HTMLPreElement>(null);
  const letterRef = useRef<HTMLPreElement>(null);
  const memoRef   = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current && agent.status === 'streaming')
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [agent.output, agent.status]);

  useEffect(() => {
    if (letterRef.current && agent.letterStatus === 'streaming')
      letterRef.current.scrollTop = letterRef.current.scrollHeight;
  }, [agent.letterOutput, agent.letterStatus]);

  useEffect(() => {
    if (memoRef.current && agent.memoStatus === 'streaming')
      memoRef.current.scrollTop = memoRef.current.scrollHeight;
  }, [agent.memoOutput, agent.memoStatus]);

  const isIdle      = agent.status === 'idle';
  const isStreaming = agent.status === 'streaming';
  const isDone      = agent.status === 'done';
  const isError     = agent.status === 'error';

  const wrapperClass = isStreaming
    ? 'streaming-border'
    : isDone
      ? 'done-border'
      : isError
        ? 'error-border'
        : '';

  const wrapperStyle: React.CSSProperties = isStreaming
    ? { boxShadow: `0 4px 24px ${AGENT_GLOW[agent.id]}` }
    : isDone
      ? { boxShadow: '0 2px 10px rgba(16, 185, 129, 0.1)' }
      : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          'rounded-[18px] transition-shadow duration-700',
          wrapperClass,
          !wrapperClass && 'border border-cream-300',
        )}
        style={wrapperStyle}
      >
        <div className={cn(
          'rounded-[17px] p-5 bg-white transition-all duration-500',
          isStreaming && 'bg-white',
        )}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold text-white shrink-0 transition-all duration-300',
                  `bg-gradient-to-br ${AGENT_GRADIENT[agent.id]}`,
                  isIdle && 'opacity-30 grayscale',
                )}
              >
                0{agent.id}
              </div>
              <div>
                <h3 className={cn(
                  'font-display text-base tracking-wide uppercase leading-none transition-colors duration-300',
                  isIdle ? 'text-cream-500' : 'text-cream-900',
                )}>
                  {agent.name}
                </h3>
                <p className={cn(
                  'text-xs transition-colors duration-300 mt-0.5',
                  isIdle ? 'text-cream-500' : 'text-cream-600',
                )}>
                  {agent.tagline}
                </p>
              </div>
            </div>
            <StatusBadge status={agent.status} />
          </div>

          {/* Body — agents 1–3 */}
          {agent.id !== 4 && (
            <AnimatePresence>
              {(isStreaming || isDone || isError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl bg-cream-100 border border-cream-200 overflow-hidden">
                    <pre
                      ref={outputRef}
                      className={cn(
                        'font-mono text-[11px] leading-relaxed whitespace-pre-wrap p-4',
                        'text-cream-700 overflow-y-auto',
                        isExpanded ? 'max-h-96' : 'max-h-44',
                        isStreaming && 'cursor-blink',
                      )}
                    >
                      {agent.output || (isStreaming ? ' ' : '')}
                    </pre>
                  </div>

                  {isDone && agent.output.length > 200 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={cn(
                        'mt-2 flex items-center gap-1 text-[11px] transition-colors',
                        AGENT_ACCENT[agent.id],
                        'opacity-60 hover:opacity-100',
                      )}
                    >
                      {isExpanded
                        ? <><ChevronUp size={11} /> Collapse output</>
                        : <><ChevronDown size={11} /> Expand full output</>
                      }
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Agent 4 — tabbed letter + memo */}
          {agent.id === 4 && (isStreaming || isDone) && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setActiveTab('letter')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                        activeTab === 'letter'
                          ? 'bg-cream-900 text-white'
                          : 'text-cream-500 hover:text-cream-700 border border-cream-200 hover:border-cream-400',
                      )}
                    >
                      <Mail size={11} />
                      Claimant Letter
                      {agent.letterStatus === 'done'      && <CheckCircle2 size={10} className="text-emerald-400 ml-0.5" />}
                      {agent.letterStatus === 'streaming' && <Loader2 size={10} className="animate-spin ml-0.5" />}
                    </button>
                    <button
                      onClick={() => setActiveTab('memo')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                        activeTab === 'memo'
                          ? 'bg-cream-900 text-white'
                          : 'text-cream-500 hover:text-cream-700 border border-cream-200 hover:border-cream-400',
                      )}
                    >
                      <FileText size={11} />
                      Adjuster Memo
                      {agent.memoStatus === 'done'      && <CheckCircle2 size={10} className="text-emerald-400 ml-0.5" />}
                      {agent.memoStatus === 'streaming' && <Loader2 size={10} className="animate-spin ml-0.5" />}
                    </button>
                  </div>

                  <div className="rounded-xl bg-cream-100 border border-cream-200 overflow-hidden">
                    {activeTab === 'letter' && (
                      <pre
                        ref={letterRef}
                        className={cn(
                          'font-mono text-[11px] leading-relaxed whitespace-pre-wrap p-4',
                          'text-cream-700 overflow-y-auto max-h-52',
                          agent.letterStatus === 'streaming' && 'cursor-blink',
                        )}
                      >
                        {agent.letterOutput || (agent.letterStatus === 'streaming' ? ' ' : 'Waiting...')}
                      </pre>
                    )}
                    {activeTab === 'memo' && (
                      <pre
                        ref={memoRef}
                        className={cn(
                          'font-mono text-[11px] leading-relaxed whitespace-pre-wrap p-4',
                          'text-cream-700 overflow-y-auto max-h-52',
                          agent.memoStatus === 'streaming' && 'cursor-blink',
                        )}
                      >
                        {agent.memoOutput || (agent.memoStatus === 'streaming' ? ' ' : 'Waiting...')}
                      </pre>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: AgentState['status'] }) {
  if (status === 'idle') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-100 border border-cream-200">
      <Clock size={9} className="text-cream-600" />
      <span className="text-[10px] text-cream-600 font-mono tracking-wider">IDLE</span>
    </div>
  );

  if (status === 'streaming') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-[10px] text-blue-600 font-mono tracking-wider">PROCESSING</span>
    </div>
  );

  if (status === 'done') return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200"
    >
      <CheckCircle2 size={10} className="text-emerald-600" />
      <span className="text-[10px] text-emerald-700 font-mono tracking-wider">COMPLETE</span>
    </motion.div>
  );

  if (status === 'error') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
      <AlertCircle size={10} className="text-red-500" />
      <span className="text-[10px] text-red-600 font-mono tracking-wider">ERROR</span>
    </div>
  );

  return null;
}
