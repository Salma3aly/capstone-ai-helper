'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/lib/context/ProjectContext';
import StageStepper from './StageStepper';
import { Save, Check, ArrowLeft, ArrowRight } from 'lucide-react';

const mq = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const reduced = mq?.matches ?? false;

export default function ProjectHeader() {
  const { project, saving, advanceStage, goBackStage, stageIndex, totalStages, saveProject } = useProject();
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    await saveProject();
    if (reduced) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, [saveProject]);

  if (!project) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-[#e2e8f0] bg-white">
      <div className="flex items-center gap-4 min-w-0">
        {stageIndex > 0 && (
          <motion.button
            onClick={goBackStage}
            whileHover={reduced ? {} : { scale: 1.05 }}
            whileTap={reduced ? {} : { scale: 0.95 }}
            className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#f8fafc] transition shrink-0"
            aria-label="Previous stage"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        )}
        <h1 className="text-base font-bold text-[#0f172a] truncate">{project.title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <StageStepper />

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[#e2e8f0]">
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={reduced ? {} : { scale: 0.95 }}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition overflow-hidden
              bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span
                  key="saved"
                  initial={reduced ? {} : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduced ? {} : { scale: 0.5, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                  className="flex items-center gap-1 text-emerald-600"
                >
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </motion.span>
              ) : (
                <motion.span
                  key="save"
                  initial={reduced ? {} : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduced ? {} : { scale: 0.5, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {stageIndex < totalStages - 1 && (
            <motion.button
              onClick={advanceStage}
              whileHover={reduced ? {} : { scale: 1.02 }}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#ec4899] text-white hover:bg-[#db2777] transition"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
