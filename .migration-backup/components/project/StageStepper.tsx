'use client';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProject } from '@/lib/context/ProjectContext';
import { Check } from 'lucide-react';
import type { SandboxStage } from '@/lib/sandbox/types';

const STAGES: { key: SandboxStage; label: string; slug: string }[] = [
  { key: 'idea',       label: 'Idea',       slug: 'idea' },
  { key: 'analyzed',   label: 'Analysis',   slug: 'analysis' },
  { key: 'components', label: 'Components', slug: 'components' },
  { key: 'wiring',     label: 'Wiring',     slug: 'wiring' },
  { key: 'code',       label: 'Code',       slug: 'code' },
];

const mq = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const prefersReducedMotion = mq?.matches ?? false;

export default function StageStepper() {
  const { currentStage, isStageCompleted, isStageAccessible, goToStage } = useProject();

  const handleClick = useCallback((stage: SandboxStage) => {
    if (isStageAccessible(stage)) goToStage(stage);
  }, [isStageAccessible, goToStage]);

  return (
    <nav className="flex items-center gap-1" aria-label="Project stages">
      {STAGES.map((s, i) => {
        const completed = isStageCompleted(s.key);
        const active = currentStage === s.key;
        const accessible = isStageAccessible(s.key);

        return (
          <div key={s.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`h-px w-6 mx-0.5 transition-colors ${
                completed ? 'bg-[#ec4899]' : 'bg-[#e2e8f0]'
              }`} />
            )}
            <motion.button
              onClick={() => handleClick(s.key)}
              disabled={!accessible}
              layout={prefersReducedMotion ? false : true}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#ec4899] text-white shadow-sm'
                  : completed
                    ? 'bg-[#fdf2f8] text-[#ec4899]'
                    : 'bg-transparent text-[#94a3b8] cursor-not-allowed'
              }`}
            >
              {completed ? (
                <motion.span
                  initial={prefersReducedMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Check className="w-3 h-3" />
                </motion.span>
              ) : (
                <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center text-[8px] font-bold leading-none"
                  style={{ borderColor: active ? 'white' : '#cbd5e1', color: active ? 'white' : '#cbd5e1' }}
                >
                  {i + 1}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="stage-pill-bg"
                  transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-[#ec4899] -z-10"
                />
              )}
              <span className={active ? 'text-white' : ''}>{s.label}</span>
            </motion.button>
          </div>
        );
      })}
    </nav>
  );
}