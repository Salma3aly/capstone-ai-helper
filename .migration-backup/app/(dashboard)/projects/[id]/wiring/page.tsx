'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import StageTransition from '@/components/project/StageTransition';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';
import type { WiringDiagram } from '@/lib/sandbox/types';

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = mq?.matches ?? false;

export default function WiringStage() {
  const { project, updateProject, goToStage } = useProject();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wiringDraft: WiringDiagram | null = project?.wiring || null;

  const runWiring = async () => {
    if (!project || !project.components) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sandbox/wiring', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: project.rawIdea, components: project.components }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const wiring = data.wiring as WiringDiagram;
      await fetch(`/api/sandbox/projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wiring, stage: 'wiring' }),
      });
      updateProject({ wiring, stage: 'wiring' });
    } catch {
      setError('Wiring generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!project) return;
    await fetch(`/api/sandbox/projects/${project.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'code' }),
    });
    updateProject({ stage: 'code' });
    goToStage('code');
  };

  const diagramNodes = wiringDraft?.nodes;
  const diagramEdges = wiringDraft?.edges;

  return (
    <StageTransition id="wiring">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Architecture Diagram — always visible, demo data until wiring is generated */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a]">Architecture Diagram</h3>
            {diagramNodes && (
              <span className="text-[10px] text-[#94a3b8]">{diagramNodes.length} nodes, {diagramEdges?.length || 0} connections</span>
            )}
          </div>
          <ArchitectureDiagram nodes={diagramNodes} edges={diagramEdges} />
        </motion.div>

        {/* Generate wiring button (shown when no wiring data yet) */}
        {!wiringDraft && (
          <div className="flex justify-center">
            <motion.button
              onClick={runWiring}
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Wiring'}
            </motion.button>
          </div>
        )}

        {/* Continue to Code */}
        {wiringDraft && (
          <div className="flex justify-end">
            <motion.button
              onClick={handleContinue}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              Continue to Code
            </motion.button>
          </div>
        )}
      </div>
    </StageTransition>
  );
}
