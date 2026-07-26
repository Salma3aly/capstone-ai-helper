'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, RefreshCw, Box } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import StageTransition from '@/components/project/StageTransition';
import { EditableField, EditableList } from '@/components/project/EditableComponents';
import type { ComponentRecommendation } from '@/lib/sandbox/types';

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = mq?.matches ?? false;

const BLANK_PLACEHOLDER = /^(—|n\/?a|none|null|undefined|to be determined|tbd|-)$/i;
const HW_ONLY = /standalone|microcontroller|arduino|no web |no ui|embedded|raspberry\s*pi|esp32|esp8266|pico|hardware\b/i;
const FALLBACKS = { frontend: 'Next.js (React)', backend: 'Next.js API Routes (Node.js)', database: 'SQLite' };

function sanitizeStack(components: ComponentRecommendation, rawIdea: string, analysis: unknown): ComponentRecommendation {
  if (!components.suggested_stack) return components;
  const context = (rawIdea + ' ' + JSON.stringify(analysis || '')).toLowerCase();
  const isHwOnly = HW_ONLY.test(context) ||
    (BLANK_PLACEHOLDER.test(components.suggested_stack.frontend) &&
     BLANK_PLACEHOLDER.test(components.suggested_stack.backend) &&
     BLANK_PLACEHOLDER.test(components.suggested_stack.database));
  if (isHwOnly) {
    components.suggested_stack.frontend = 'Not applicable — standalone microcontroller project';
    components.suggested_stack.backend = 'Not applicable — standalone microcontroller project';
    components.suggested_stack.database = 'Not applicable — standalone microcontroller project';
  } else {
    for (const key of ['frontend', 'backend', 'database'] as const) {
      if (!components.suggested_stack[key] || BLANK_PLACEHOLDER.test(components.suggested_stack[key])) {
        components.suggested_stack[key] = FALLBACKS[key];
      }
    }
  }
  return components;
}

export default function ComponentsStage() {
  const { project, updateProject, goToStage } = useProject();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<ComponentRecommendation | null>(project?.components || null);

  const runComponents = async () => {
    if (!project || !project.analysis) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sandbox/components', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: project.rawIdea, analysis: project.analysis }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const components = sanitizeStack(data.components as ComponentRecommendation, project.rawIdea, project.analysis);
      setDraft(components);
    } catch {
      setError('Component recommendation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!project || !draft) return;
    setLoading(true);
    try {
      await fetch(`/api/sandbox/projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components: draft, stage: 'wiring' }),
      });
      updateProject({ components: draft, stage: 'wiring' });
      goToStage('wiring');
    } catch {
      setError('Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <StageTransition id="components-empty">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3"
          >
            <Box className="w-10 h-10 text-[#ec4899] mx-auto" />
            <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Design Components</h3>
            <p className="text-sm text-[#64748b]">Generate component recommendations based on your analysis.</p>
            <motion.button
              onClick={runComponents}
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Components'}
            </motion.button>
          </motion.div>
        </div>
      </StageTransition>
    );
  }

  return (
    <StageTransition id="components">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Suggested Stack */}
          {draft.suggested_stack && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Suggested Stack</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['frontend', 'backend', 'database'] as const).map((key) => (
                  <div key={key} className="bg-[#f8fafc] rounded-lg p-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">{key}</label>
                    <p className="text-sm font-medium text-[#0f172a]">{draft.suggested_stack[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          {draft.pages && draft.pages.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Pages</h3>
              {draft.pages.map((page, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                  <span className="text-sm font-medium text-[#0f172a]">{page.name}</span>
                  <span className="text-xs text-[#64748b]">— {page.purpose}</span>
                </div>
              ))}
            </div>
          )}

          {/* Data Models */}
          {draft.data_models && draft.data_models.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Data Models</h3>
              {draft.data_models.map((dm, i) => (
                <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                  <p className="text-sm font-medium text-[#0f172a]">{dm.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dm.fields.map((f, j) => (
                      <span key={j} className="text-[10px] bg-[#e2e8f0] text-[#64748b] px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integrations */}
          {draft.integrations && draft.integrations.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Integrations</h3>
              {draft.integrations.map((int, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                  <span className="text-sm font-medium text-[#0f172a]">{int.name}</span>
                  <span className="text-xs text-[#64748b]">— {int.why}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <motion.button
              onClick={handleContinue}
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Continue to Wiring'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </StageTransition>
  );
}
