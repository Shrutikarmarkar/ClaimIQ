'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, CheckCircle2, AlertCircle, Loader2, Upload, FileText, TriangleAlert, RefreshCw, X } from 'lucide-react';
import { SampleClaim, QueuedClaim, CompletedCase } from '@/lib/types';

export interface DuplicateWarning {
  existingCase: CompletedCase;
}

interface ClaimQueueProps {
  sampleClaims: SampleClaim[];
  selectedClaimId: string | null;
  claimText: string;
  isProcessing: boolean;
  queue: QueuedClaim[];
  onSelectClaim: (claim: SampleClaim) => void;
  onChangeText: (text: string) => void;
  onProcess: () => void;
  duplicateWarning?: DuplicateWarning | null;
  onDismissDuplicate?: () => void;
  onProcessAnyway?: () => void;
}

const RISK_CONFIG = {
  LOW:          { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', circle: 'bg-emerald-100 text-emerald-700', label: 'Low Risk' },
  'LOW-MEDIUM': { badge: 'bg-cyan-100    text-cyan-700    border-cyan-200',    circle: 'bg-cyan-100    text-cyan-700',    label: 'Low–Med' },
  MEDIUM:       { badge: 'bg-amber-100   text-amber-700   border-amber-200',   circle: 'bg-amber-100   text-amber-700',   label: 'Medium Risk' },
  HIGH:         { badge: 'bg-red-100     text-red-700     border-red-200',     circle: 'bg-red-100     text-red-700',     label: 'High Risk' },
};

const QUEUE_STATUS = {
  queued:     { icon: <Clock     size={10} className="text-amber-500" />,               text: 'text-amber-600',   label: 'Queued' },
  processing: { icon: <Loader2   size={10} className="text-blue-500 animate-spin" />,   text: 'text-blue-600',    label: 'Processing' },
  done:       { icon: <CheckCircle2 size={10} className="text-emerald-500" />,          text: 'text-emerald-600', label: 'Done' },
  error:      { icon: <AlertCircle  size={10} className="text-red-500" />,              text: 'text-red-600',     label: 'Error' },
};

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function ClaimQueue({
  sampleClaims, selectedClaimId, claimText, isProcessing,
  queue, onSelectClaim, onChangeText, onProcess,
  duplicateWarning, onDismissDuplicate, onProcessAnyway,
}: ClaimQueueProps) {
  const canProcess  = claimText.trim().length > 20 && !isProcessing;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPdfError(null);

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setIsExtractingPdf(true);
      setFileName(file.name);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64 }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setPdfError(data.error ?? 'Failed to extract PDF text');
          setFileName(null);
        } else {
          onChangeText(data.text);
        }
      } catch {
        setPdfError('Failed to read PDF file');
        setFileName(null);
      } finally {
        setIsExtractingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => { onChangeText(ev.target?.result as string); setFileName(file.name); };
      reader.readAsText(file);
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Sample claims — product-card grid ── */}
      <div>
        <p className="text-[10px] text-cream-600 font-mono tracking-[0.2em] uppercase mb-4">Sample Claims</p>
        <div className="grid grid-cols-2 gap-3">
          {sampleClaims.map((claim, i) => {
            const cfg        = RISK_CONFIG[claim.riskLevel];
            const isSelected = selectedClaimId === claim.id;

            return (
              <motion.button
                key={claim.id}
                onClick={() => onSelectClaim(claim)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'text-left flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200',
                  isSelected
                    ? 'border-cream-900 bg-cream-900'
                    : 'border-cream-200 bg-white hover:border-cream-400 hover:shadow-md',
                )}
              >
                {/* Risk circle — like the product circular image */}
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center font-display text-xs tracking-wide leading-none transition-colors',
                  isSelected ? 'bg-white/15 text-white' : cfg.circle,
                )}>
                  {claim.riskLevel.replace('-', '\n')}
                </div>

                {/* Claim info */}
                <div className="flex-1">
                  <p className={cn('text-xs font-semibold leading-tight', isSelected ? 'text-white' : 'text-cream-900')}>
                    {claim.label}
                  </p>
                  <p className={cn('text-[10px] mt-0.5 font-mono', isSelected ? 'text-white/70' : 'text-cream-600')}>
                    {claim.type}
                  </p>
                </div>

                {/* Amount — like the price in the reference */}
                <p className={cn('text-lg font-black leading-none', isSelected ? 'text-white' : 'text-cream-900')}>
                  {claim.amount}
                </p>

                {/* Select button — like ADD TO CART */}
                <div className={cn(
                  'w-full py-2 rounded-xl text-[11px] font-display tracking-[0.1em] uppercase text-center transition-all',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'border border-cream-200 text-cream-500 hover:border-cream-900 hover:bg-cream-900 hover:text-white',
                )}>
                  {isSelected ? '✓ Selected' : 'Select'}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-cream-200" />
        <span className="text-[10px] text-cream-500 font-mono tracking-wider">OR</span>
        <div className="flex-1 h-px bg-cream-200" />
      </div>

      {/* ── Custom claim input ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-cream-600 font-mono tracking-[0.2em] uppercase">
            Custom Claim
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-all',
              isProcessing
                ? 'opacity-40 cursor-not-allowed border-cream-200 text-cream-500'
                : 'border-cream-200 text-cream-600 hover:border-cream-900 hover:text-cream-900',
            )}
          >
            <Upload size={10} />
            Upload File
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.pdf" className="hidden" onChange={handleFileChange} />
        </div>

        {isExtractingPdf && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
            <Loader2 size={10} className="text-blue-500 shrink-0 animate-spin" />
            <span className="text-[10px] text-blue-600 font-mono">Extracting PDF text…</span>
          </div>
        )}

        {!isExtractingPdf && fileName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
            <FileText size={10} className="text-blue-500 shrink-0" />
            <span className="text-[10px] text-blue-600 font-mono truncate flex-1">{fileName}</span>
            <button onClick={() => { setFileName(null); onChangeText(''); }} className="text-blue-400 hover:text-blue-700 transition-colors">
              <X size={10} />
            </button>
          </div>
        )}

        {pdfError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={10} className="text-red-500 shrink-0" />
            <span className="text-[10px] text-red-600 font-mono">{pdfError}</span>
          </div>
        )}

        <textarea
          value={claimText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Paste a claim narrative here..."
          disabled={isProcessing}
          rows={7}
          className={cn(
            'w-full rounded-xl border bg-cream-50 text-cream-800 text-xs',
            'placeholder:text-cream-300 font-mono leading-relaxed',
            'px-4 py-3 resize-none outline-none',
            'transition-all duration-200',
            'border-cream-200 focus:border-cream-700 focus:bg-white focus:shadow-[0_0_0_3px_rgba(23,20,18,0.05)]',
            isProcessing && 'opacity-50 cursor-not-allowed',
          )}
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-cream-500 font-mono">
            {claimText.length > 0 ? `${claimText.length} chars` : ''}
          </span>
          {claimText.length > 0 && !isProcessing && (
            <button onClick={() => { onChangeText(''); setFileName(null); }}
              className="text-[10px] text-cream-600 hover:text-red-500 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Duplicate warning ── */}
      <AnimatePresence>
        {duplicateWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <TriangleAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Already Processed</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  <span className="font-semibold">"{duplicateWarning.existingCase.claimLabel}"</span> was processed
                  on {formatDate(duplicateWarning.existingCase.completedAt)} —
                  verdict <span className="font-bold">{duplicateWarning.existingCase.verdict.toUpperCase()}</span> at {duplicateWarning.existingCase.confidence}% confidence.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDismissDuplicate}
                className="flex-1 py-2 rounded-xl text-[11px] font-display tracking-wider uppercase border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onProcessAnyway}
                className="flex-1 py-2 rounded-xl text-[11px] font-display tracking-wider uppercase bg-amber-700 text-white hover:bg-amber-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={11} /> Process Anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Process button — like ADD TO CART ── */}
      <motion.button
        onClick={onProcess}
        disabled={!canProcess}
        whileHover={canProcess ? { scale: 1.01 } : {}}
        whileTap={canProcess ? { scale: 0.97 } : {}}
        className={cn(
          'w-full py-4 rounded-2xl font-display text-xl tracking-[0.1em] uppercase transition-all duration-300',
          'flex items-center justify-center gap-3',
          canProcess
            ? 'bg-cream-900 text-white hover:bg-cream-700 shadow-sm hover:shadow-lg'
            : 'bg-cream-100 text-cream-500 cursor-not-allowed border border-cream-200',
        )}
      >
        {isProcessing
          ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
          : <><Plus size={16} /> Run Agent Pipeline</>
        }
      </motion.button>

      {/* ── Queue ── */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] text-cream-600 font-mono tracking-[0.2em] uppercase mb-2">
              Queue ({queue.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {queue.map((item) => {
                const s = QUEUE_STATUS[item.status];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-cream-200"
                  >
                    {s.icon}
                    <span className="text-[11px] text-cream-700 flex-1 truncate font-medium">{item.label}</span>
                    <span className={cn('text-[9px] font-mono', s.text)}>{s.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
