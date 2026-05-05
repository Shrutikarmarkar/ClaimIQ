'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, BarChart2 } from 'lucide-react';
import { NavStats } from '@/lib/types';

interface NavbarProps {
  stats: NavStats;
  onOpenHistory?: () => void;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    const duration = 800;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(interval);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <span className="stat-value">
      {displayed}{suffix}
    </span>
  );
}

export default function Navbar({ stats, onOpenHistory }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-cream-300 transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_8px_rgba(23,20,18,0.07)]' : ''
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-cream-900 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-xs tracking-tight">IQ</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-2xl tracking-wide text-cream-900 leading-none">
              ClaimIQ
            </span>
            <span className="text-[10px] text-cream-600 font-mono tracking-widest uppercase hidden sm:block">
              Multi-Agent Intelligence
            </span>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-2">
          <StatChip
            icon={<Activity size={11} className="text-blue-500" />}
            label="Processed"
            value={<AnimatedNumber value={stats.processed} />}
            color="blue"
            onClick={onOpenHistory}
          />
          <StatChip
            icon={<CheckCircle size={11} className="text-emerald-500" />}
            label="Approval Rate"
            value={<AnimatedNumber value={stats.approvalRate} suffix="%" />}
            color="green"
            onClick={onOpenHistory}
          />
          <StatChip
            icon={<BarChart2 size={11} className="text-violet-500" />}
            label="Avg Confidence"
            value={<AnimatedNumber value={stats.avgConfidence} suffix="%" />}
            color="purple"
            onClick={onOpenHistory}
          />
        </div>
      </div>
    </header>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: 'blue' | 'green' | 'purple';
  onClick?: () => void;
}) {
  const colors = {
    blue:   'border-blue-200   bg-blue-50   hover:border-blue-300   hover:bg-blue-100/70',
    green:  'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/70',
    purple: 'border-violet-200 bg-violet-50 hover:border-violet-300 hover:bg-violet-100/70',
  };

  return (
    <div
      onClick={onClick}
      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${colors[color]} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {icon}
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold text-cream-900">{value}</span>
        <span className="text-[9px] text-cream-600 font-mono tracking-wide uppercase">{label}</span>
      </div>
    </div>
  );
}
