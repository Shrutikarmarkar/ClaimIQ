'use client';

import { motion } from 'framer-motion';
import AgentCard from './AgentCard';
import { AgentState } from '@/lib/types';

interface AgentPipelineProps {
  agents: AgentState[];
  isProcessing: boolean;
  isComplete: boolean;
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AgentPipeline({ agents, isProcessing, isComplete }: AgentPipelineProps) {
  const completedCount = agents.filter(a => a.status === 'done').length;
  const progressPct    = (completedCount / 4) * 100;
  const activeAgent    = agents.find(a => a.status === 'streaming');

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar + status */}
      {(isProcessing || isComplete) && (
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 h-1 bg-cream-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-cream-900"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="font-display text-2xl text-cream-900 leading-none shrink-0">
            {completedCount}<span className="text-cream-500">/4</span>
          </span>
        </div>
      )}

      {(isProcessing && activeAgent) && (
        <p className="text-[11px] text-cream-600 font-mono tracking-wider -mt-2 mb-2">
          ↳ {activeAgent.name}
        </p>
      )}

      {/* Agent cards with connectors */}
      <div className="flex flex-col">
        {agents.map((agent, i) => {
          const prevDone = i === 0 ? true : agents[i - 1].status === 'done';
          const isActive = agent.status === 'streaming';
          const isDone   = agent.status === 'done';

          return (
            <div key={agent.id} className="flex flex-col">
              <AgentCard agent={agent} index={i} />

              {i < agents.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="relative w-px h-6">
                    <div className="absolute inset-0 bg-cream-200 rounded-full" />
                    <motion.div
                      className={cn(
                        'absolute top-0 left-0 right-0 rounded-full',
                        isDone   ? 'bg-emerald-400' :
                        isActive ? 'bg-blue-400'    : 'bg-transparent',
                      )}
                      initial={{ height: '0%' }}
                      animate={{ height: isDone || isActive ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {isActive && prevDone && (
                      <motion.div
                        className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ marginTop: '-3px' }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
