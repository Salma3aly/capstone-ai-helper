'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, RefreshCw, Braces } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import StageTransition from '@/components/project/StageTransition';
import { EditableField, EditableList } from '@/components/project/EditableComponents';
import type { IdeaAnalysis } from '@/lib/sandbox/types';

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = mq?.matches ?? false;

export default function AnalysisStage() {
  const { project, updateProject, goToStage } = useProject();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<IdeaAnalysis | null>(project?.analysis || null);

  const runAnalyze = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sandbox/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: project.rawIdea }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const analysis = data.analysis as IdeaAnalysis;
      setDraft(analysis);
      await fetch(`/api/sandbox/projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, title: analysis.title || project.title }),
      });
      updateProject({ analysis, title: analysis.title || project.title });
    } catch {
      setError('Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!project || !draft) return;
    await fetch(`/api/sandbox/projects/${project.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: draft, stage: 'components' }),
    });
    updateProject({ analysis: draft, stage: 'components' });
    goToStage('components');
  };

  // Also run components API call automatically on continue
  const handleContinueWithComponents = async () => {
    if (!project || !draft) return;
    setLoading(true);
    try {
      await handleContinue();
      const compRes = await fetch('/api/sandbox/components', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: project.rawIdea, analysis: draft }),
      });
      const compData = await compRes.json();
      if (!compData.error) {
        await fetch(`/api/sandbox/projects/${project.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ components: compData.components, stage: 'components' }),
        });
        updateProject({ components: compData.components, stage: 'components' });
      }
    } catch {
      setError('Failed to generate components.');
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <StageTransition id="analysis-empty">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3"
          >
            <Braces className="w-10 h-10 text-[#ec4899] mx-auto" />
            <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Analyze</h3>
            <p className="text-sm text-[#64748b]">Click the button below to analyze your idea.</p>
            <motion.button
              onClick={runAnalyze}
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </motion.button>
          </motion.div>
        </div>
      </StageTransition>
    );
  }

  return (
    <StageTransition id="analysis">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f172a]">{draft.title}</h2>
            <button onClick={runAnalyze} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <EditableField label="Problem Statement" value={draft.problem_statement || ''} onChange={(v) => setDraft({ ...draft, problem_statement: v })} />
          <EditableField label="Target User" value={draft.target_user || ''} onChange={(v) => setDraft({ ...draft, target_user: v })} />
          <EditableList label="Core Features" items={draft.core_features ?? []} onChange={(items) => setDraft({ ...draft, core_features: items })} />
          <EditableList label="Out of Scope" items={draft.out_of_scope ?? []} onChange={(items) => setDraft({ ...draft, out_of_scope: items })} />
          <EditableList label="Clarifying Questions" items={draft.clarifying_questions ?? []} onChange={(items) => setDraft({ ...draft, clarifying_questions: items })} />
        </motion.div>

        <div className="flex justify-end">
          <motion.button
            onClick={handleContinueWithComponents}
            disabled={loading}
            whileTap={reduced ? {} : { scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Generating Components...' : 'Continue to Components'}
          </motion.button>
        </div>
      </div>
    </StageTransition>
  );
}
