'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import StageTransition from '@/components/project/StageTransition';
import type { IdeaAnalysis, RecommendResponse } from '@/lib/sandbox/types';

const EXAMPLE_IDEAS = [
  "A flashcard app with spaced repetition",
  "A group expense splitter",
  "A weather dashboard",
  "A recipe manager",
];

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = mq?.matches ?? false;

export default function IdeaStage() {
  const { project, updateProject, goToStage } = useProject();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rawIdea = project?.rawIdea || '';

  const runAnalyze = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const [anaRes, recRes] = await Promise.all([
        fetch('/api/sandbox/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: project.rawIdea }),
        }),
        fetch('/api/sandbox/recommend', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: project.rawIdea }),
        }).catch(() => null),
      ]);
      const anaData = await anaRes.json();
      if (anaData.error) { setError(anaData.error); return; }
      const analysis = anaData.analysis as IdeaAnalysis;

      let rec: RecommendResponse | null = null;
      if (recRes && recRes.ok) rec = await recRes.json() as RecommendResponse;

      await fetch(`/api/sandbox/projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, title: analysis.title || project.title, stage: 'analyzed', hardwareRecommendation: rec || undefined }),
      });
      updateProject({ analysis, title: analysis.title || project.title, stage: 'analyzed', hardwareRecommendation: rec || undefined });
      goToStage('analyzed');
    } catch {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StageTransition id="idea">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[#0f172a] mb-1">Your Idea</label>
            <textarea
              value={rawIdea}
              onChange={(e) => project && updateProject({ rawIdea: e.target.value })}
              placeholder="Describe what you want to build..."
              rows={5}
              maxLength={2000}
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent resize-none"
            />
            <p className="text-xs text-[#94a3b8] mt-1">{rawIdea.length}/2000</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_IDEAS.map((ex) => (
              <button
                key={ex}
                onClick={() => project && updateProject({ rawIdea: ex })}
                className="text-xs text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 hover:border-[#ec4899] hover:text-[#ec4899] transition"
              >
                {ex}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <motion.button
            onClick={runAnalyze}
            disabled={loading || !rawIdea.trim()}
            whileTap={reduced ? {} : { scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] disabled:cursor-not-allowed rounded-xl transition shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Analyzing...' : 'Analyze Idea'}
          </motion.button>
        </motion.div>
      </div>
    </StageTransition>
  );
}
