'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import StageTransition from '@/components/project/StageTransition';
import type { CodeGeneration } from '@/lib/sandbox/types';

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = mq?.matches ?? false;

export default function CodeStage() {
  const { project, updateProject } = useProject();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const codeDraft: CodeGeneration | null = project?.code || null;
  const codeText = codeDraft?.files?.[0]?.content || streamingContent || '';
  const readme = codeDraft?.readme || '';
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingContent]);

  const runCodeGeneration = async () => {
    if (!project) return;
    setLoading(true);
    setError('');
    setStreamingContent('');
    try {
      const res = await fetch('/api/sandbox/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: project.rawIdea,
          components: project.components,
          wiring: project.wiring,
        }),
      });
      if (!res.ok) { setError('Code generation failed.'); setLoading(false); return; }
      const reader = res.body?.getReader();
      if (!reader) { setError('Stream unavailable.'); setLoading(false); return; }
      setStreaming(true);
      setLoading(false);
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setStreamingContent(acc);
      }
      setStreaming(false);
      try {
        const parsed = JSON.parse(acc);
        const code = parsed as CodeGeneration;
        if (code.files?.[0]?.content) {
          await fetch(`/api/sandbox/projects/${project.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          updateProject({ code });
        }
      } catch {
        // streaming content is raw code, not JSON — keep it in state
      }
    } catch {
      setError('Code generation failed.');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  return (
    <StageTransition id="code">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {!codeText ? (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3"
          >
            <Zap className="w-10 h-10 text-[#ec4899] mx-auto" />
            <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Generate Code</h3>
            <p className="text-sm text-[#64748b]">Generate the implementation code based on your architecture.</p>
            <motion.button
              onClick={runCodeGeneration}
              disabled={loading}
              whileTap={reduced ? {} : { scale: 0.98 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Code'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0f172a]">Generated Code</h3>
              {streaming && <span className="text-[10px] text-[#ec4899] animate-pulse">Streaming...</span>}
            </div>
            <div className="overflow-auto max-h-[600px]">
              <pre className="text-xs leading-relaxed p-4 font-mono text-[#0f172a] whitespace-pre-wrap">
                <code>{codeText}</code>
              </pre>
              <div ref={endRef} />
            </div>
            {readme && (
              <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
                <h4 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">README</h4>
                <pre className="text-xs text-[#475569] whitespace-pre-wrap">{readme}</pre>
              </div>
            )}
            <div className="p-3 border-t border-[#e2e8f0] flex justify-end">
              <motion.button
                onClick={runCodeGeneration}
                disabled={loading}
                whileTap={reduced ? {} : { scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] rounded-lg transition"
              >
                <Sparkles className="w-3 h-3" /> Regenerate
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </StageTransition>
  );
}
