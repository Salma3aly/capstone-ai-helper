"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, AlertCircle, ArrowLeft, ArrowRight,
  Check, Save, FileCode, Share2, Download, Trash2, RefreshCw,
  Edit3, Braces, Box, Network, Zap,
} from "lucide-react";
import type {
  SandboxProject, SandboxStage, IdeaAnalysis,
  ComponentRecommendation, WiringDiagram, CodeGeneration,
} from "@/lib/sandbox/types";
import {
  getProject, updateProject, createProject,
} from "@/lib/sandbox/store";
import { CodePanel } from "@/components/sandbox/CodePanel";

// ─── Helpers ───────────────────────────────────────────────────────────

const STAGE_META: Record<SandboxStage, { num: number; label: string; icon: typeof Sparkles }> = {
  idea:        { num: 1, label: "Idea",        icon: Edit3 },
  analyzed:    { num: 2, label: "Analysis",    icon: Braces },
  components:  { num: 3, label: "Components",  icon: Box },
  wiring:      { num: 4, label: "Wiring",      icon: Network },
  code:        { num: 5, label: "Code",        icon: Zap },
};

const STAGE_ORDER: SandboxStage[] = ["idea", "analyzed", "components", "wiring", "code"];

function stageIndex(s: SandboxStage): number {
  return STAGE_ORDER.indexOf(s);
}

const EXAMPLE_IDEAS = [
  "A flashcard app with spaced repetition",
  "A group expense splitter",
  "A weather dashboard",
  "A recipe manager",
];

// ─── Component ────────────────────────────────────────────────────────

export default function SandboxBuilder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────
  const [project, setProject] = useState<SandboxProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable copies per stage (mutated before advancing)
  const [analysisDraft, setAnalysisDraft] = useState<IdeaAnalysis | null>(null);
  const [componentsDraft, setComponentsDraft] = useState<ComponentRecommendation | null>(null);
  const [wiringDraft, setWiringDraft] = useState<WiringDiagram | null>(null);
  const [codeDraft, setCodeDraft] = useState<CodeGeneration | null>(null);

  // Streaming code
  const [streamingContent, setStreamingContent] = useState("");
  const [streaming, setStreaming] = useState(false);

  // ── Load project ──────────────────────────────────────────────────
  useEffect(() => {
    if (id === "new") {
      setLoading(false);
      return;
    }
    setLoading(true);
    getProject(id)
      .then((p) => {
        setProject(p);
        setAnalysisDraft(p.analysis);
        setComponentsDraft(p.components);
        setWiringDraft(p.wiring);
        setCodeDraft(p.code);
      })
      .catch(() => setError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Stage helpers ─────────────────────────────────────────────────
  const stage = project?.stage || "idea";
  const meta = STAGE_META[stage];
  const isLastStage = stage === "code";

  const canAdvance = useCallback((): string | null => {
    if (!project) return "No project loaded";
    if (stage === "idea" && !project.rawIdea.trim()) return "Enter an idea first";
    if (stage === "analyzed" && !analysisDraft) return "Analyze the idea first";
    if (stage === "components" && !componentsDraft) return "Define components first";
    if (stage === "wiring" && !wiringDraft) return "Design wiring first";
    return null;
  }, [project, stage, analysisDraft, componentsDraft, wiringDraft]);

  const advanceStage = useCallback(async () => {
    if (!project) return;
    const updates: Partial<SandboxProject> = {};
    const nextIdx = stageIndex(stage) + 1;
    if (nextIdx >= STAGE_ORDER.length) return;

    const nextStage = STAGE_ORDER[nextIdx];

    // Persist current stage data
    if (stage === "analyzed") updates.analysis = analysisDraft;
    else if (stage === "components") updates.components = componentsDraft;
    else if (stage === "wiring") updates.wiring = wiringDraft;
    else if (stage === "code") updates.code = codeDraft;

    updates.stage = nextStage;
    setSaving(true);
    try {
      const updated = await updateProject(project.id, updates);
      setProject(updated);
    } catch {
      setError("Failed to save progress");
    } finally {
      setSaving(false);
    }
  }, [project, stage, analysisDraft, componentsDraft, wiringDraft, codeDraft]);

  // ── Stage APIs ────────────────────────────────────────────────────
  const runAnalyze = async () => {
    if (!project) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sandbox/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const analysis = data.analysis as IdeaAnalysis;
      setAnalysisDraft(analysis);
      const updated = await updateProject(project.id, { analysis, stage: "analyzed" });
      setProject(updated);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const runComponents = async () => {
    if (!project || !analysisDraft) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sandbox/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea, analysis: analysisDraft }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const components = data.components as ComponentRecommendation;
      setComponentsDraft(components);
      const updated = await updateProject(project.id, { components, stage: "components" });
      setProject(updated);
    } catch {
      setError("Component recommendation failed.");
    } finally {
      setLoading(false);
    }
  };

  const runWiring = async () => {
    if (!project || !componentsDraft) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sandbox/wiring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea, components: componentsDraft }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const wiring = data.wiring as WiringDiagram;
      setWiringDraft(wiring);
      const updated = await updateProject(project.id, { wiring, stage: "wiring" });
      setProject(updated);
    } catch {
      setError("Wiring generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const runCodeGeneration = async () => {
    if (!project || !wiringDraft) return;
    setStreaming(true);
    setError("");
    setStreamingContent("");

    try {
      const res = await fetch("/api/sandbox/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea, wiring: wiringDraft }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        setError(err.error || "Generation failed");
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError("No response stream"); setStreaming(false); return; }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingContent(fullText);
      }

      // Parse JSON from streamed content
      const cleaned = fullText
        .replace(/```(?:json)?\s*/g, "")
        .replace(/\s*```/g, "")
        .trim();
      try {
        const codeGen = JSON.parse(cleaned) as CodeGeneration;
        setCodeDraft(codeGen);
        const updated = await updateProject(project.id, { code: codeGen, stage: "code" });
        setProject(updated);
      } catch {
        setError("Failed to parse generated code JSON. The raw output is shown below.");
      }
    } catch {
      setError("Code generation failed.");
    } finally {
      setStreaming(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const updates: Partial<SandboxProject> = {};
      if (stage === "analyzed") updates.analysis = analysisDraft!;
      if (stage === "components") updates.components = componentsDraft!;
      if (stage === "wiring") updates.wiring = wiringDraft!;
      if (stage === "code") updates.code = codeDraft!;
      const updated = await updateProject(project.id, updates);
      setProject(updated);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Navigate projects list ────────────────────────────────────────
  if (loading && id !== "new") {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#ec4899]" />
      </div>
    );
  }

  // ── New project flow ──────────────────────────────────────────────
  if (id === "new" && !project) {
    return <NewProjectForm onCreate={(p) => { router.push(`/sandbox/${p.id}`); }} />;
  }

  if (!project) return null;

  // ── Step renderers ────────────────────────────────────────────────
  const renderIdeaStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#0f172a] mb-1">Your Idea</label>
          <textarea
            value={project.rawIdea}
            onChange={(e) => setProject({ ...project, rawIdea: e.target.value })}
            placeholder="Describe what you want to build..."
            rows={5}
            maxLength={2000}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent resize-none"
          />
          <p className="text-xs text-[#94a3b8] mt-1">{project.rawIdea.length}/2000</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((ex) => (
            <button
              key={ex}
              onClick={() => setProject({ ...project, rawIdea: ex })}
              className="text-xs text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 hover:border-[#ec4899] hover:text-[#ec4899] transition"
            >
              {ex}
            </button>
          ))}
        </div>

        <button
          onClick={runAnalyze}
          disabled={loading || !project.rawIdea.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] disabled:cursor-not-allowed rounded-xl transition shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analyzing..." : "Analyze Idea"}
        </button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* If no analysis yet, show a prompt */}
      {!analysisDraft && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3">
          <Braces className="w-10 h-10 text-[#ec4899] mx-auto" />
          <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Analyze</h3>
          <p className="text-sm text-[#64748b]">Click the button below to analyze your idea.</p>
          <button
            onClick={runAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      )}

      {analysisDraft && (
        <>
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172a]">{analysisDraft.title}</h2>
              <button onClick={runAnalyze} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>

            <EditableField label="Problem Statement" value={analysisDraft.problem_statement} onChange={(v) => setAnalysisDraft({ ...analysisDraft, problem_statement: v })} />
            <EditableField label="Target User" value={analysisDraft.target_user} onChange={(v) => setAnalysisDraft({ ...analysisDraft, target_user: v })} />

            <EditableList label="Core Features" items={analysisDraft.core_features} onChange={(items) => setAnalysisDraft({ ...analysisDraft, core_features: items })} />
            <EditableList label="Out of Scope" items={analysisDraft.out_of_scope} onChange={(items) => setAnalysisDraft({ ...analysisDraft, out_of_scope: items })} />
            <EditableList label="Clarifying Questions" items={analysisDraft.clarifying_questions} onChange={(items) => setAnalysisDraft({ ...analysisDraft, clarifying_questions: items })} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => { await advanceStage(); runComponents(); }}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? "Generating Components..." : "Continue to Components"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderComponentsStep = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      {!componentsDraft && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3">
          <Box className="w-10 h-10 text-[#ec4899] mx-auto" />
          <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Design Components</h3>
          <p className="text-sm text-[#64748b]">Generate recommended pages, data models, and integrations.</p>
          <button
            onClick={runComponents}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Components"}
          </button>
        </div>
      )}

      {componentsDraft && (
        <>
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172a]">Components</h2>
              <button onClick={runComponents} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>

            {/* Stack */}
            <div className="bg-[#fdf2f8] border border-[#fbcfe8] rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#ec4899] mb-2">Suggested Stack</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-[#64748b] text-xs">Frontend</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack.frontend}</p></div>
                <div><span className="text-[#64748b] text-xs">Backend</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack.backend}</p></div>
                <div><span className="text-[#64748b] text-xs">Database</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack.database}</p></div>
              </div>
            </div>

            {/* Pages */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Pages</h4>
              <div className="space-y-1.5">
                {componentsDraft.pages.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                    <FileCode className="w-4 h-4 text-[#ec4899] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input
                        value={p.name}
                        onChange={(e) => {
                          const copy = [...componentsDraft.pages];
                          copy[i] = { ...copy[i], name: e.target.value };
                          setComponentsDraft({ ...componentsDraft, pages: copy });
                        }}
                        className="font-medium text-sm text-[#0f172a] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none w-full"
                      />
                      <input
                        value={p.purpose}
                        onChange={(e) => {
                          const copy = [...componentsDraft.pages];
                          copy[i] = { ...copy[i], purpose: e.target.value };
                          setComponentsDraft({ ...componentsDraft, pages: copy });
                        }}
                        className="text-xs text-[#64748b] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none w-full mt-0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Models */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Data Models</h4>
              <div className="space-y-1.5">
                {componentsDraft.data_models.map((m, i) => (
                  <div key={i} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                    <input
                      value={m.name}
                      onChange={(e) => {
                        const copy = [...componentsDraft.data_models];
                        copy[i] = { ...copy[i], name: e.target.value };
                        setComponentsDraft({ ...componentsDraft, data_models: copy });
                      }}
                      className="font-medium text-sm text-[#0f172a] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none w-full"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.fields.map((f, fi) => (
                        <span key={fi} className="text-[10px] bg-[#e2e8f0] text-[#64748b] px-2 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Integrations</h4>
              <div className="space-y-1.5">
                {componentsDraft.integrations.map((int, i) => (
                  <div key={i} className="flex items-start gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
                    <Share2 className="w-4 h-4 text-[#ec4899] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input
                        value={int.name}
                        onChange={(e) => {
                          const copy = [...componentsDraft.integrations];
                          copy[i] = { ...copy[i], name: e.target.value };
                          setComponentsDraft({ ...componentsDraft, integrations: copy });
                        }}
                        className="font-medium text-sm text-[#0f172a] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none w-full"
                      />
                      <input
                        value={int.why}
                        onChange={(e) => {
                          const copy = [...componentsDraft.integrations];
                          copy[i] = { ...copy[i], why: e.target.value };
                          setComponentsDraft({ ...componentsDraft, integrations: copy });
                        }}
                        className="text-xs text-[#64748b] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none w-full mt-0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => { await advanceStage(); runWiring(); }}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? "Generating Wiring..." : "Continue to Wiring"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderWiringStep = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {!wiringDraft && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3">
          <Network className="w-10 h-10 text-[#ec4899] mx-auto" />
          <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Design Architecture</h3>
          <p className="text-sm text-[#64748b]">Generate a wiring diagram showing how components connect.</p>
          <button
            onClick={runWiring}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Wiring Diagram"}
          </button>
        </div>
      )}

      {wiringDraft && (
        <>
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172a]">Architecture Diagram</h2>
              <button onClick={runWiring} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>

            {/* Simple node-edge visual */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-6 min-h-[200px]">
              <svg viewBox="0 0 600 300" className="w-full h-auto">
                {/* Edges */}
                {wiringDraft.edges.map((edge, i) => {
                  const fromNode = wiringDraft.nodes.find((n) => n.id === edge.from);
                  const toNode = wiringDraft.nodes.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;
                  const fromIdx = wiringDraft.nodes.indexOf(fromNode);
                  const toIdx = wiringDraft.nodes.indexOf(toNode);
                  const cols = Math.ceil(Math.sqrt(wiringDraft.nodes.length));
                  const fx = 100 + (fromIdx % cols) * 180;
                  const fy = 40 + Math.floor(fromIdx / cols) * 100;
                  const tx = 100 + (toIdx % cols) * 180;
                  const ty = 40 + Math.floor(toIdx / cols) * 100;
                  const mx = (fx + tx) / 2;
                  const my = (fy + ty) / 2 - 20;
                  return (
                    <g key={i}>
                      <path d={`M${fx},${fy} Q${mx},${my} ${tx},${ty}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                      <text x={mx} y={my} textAnchor="middle" className="text-[8px]" fill="#64748b">{edge.label}</text>
                    </g>
                  );
                })}
                {/* Nodes */}
                {wiringDraft.nodes.map((node, i) => {
                  const cols = Math.ceil(Math.sqrt(wiringDraft.nodes.length));
                  const x = 100 + (i % cols) * 180;
                  const y = 40 + Math.floor(i / cols) * 100;
                  const colors: Record<string, string> = {
                    page: "#ec4899",
                    service: "#3b82f6",
                    database: "#8b5cf6",
                    external: "#f59e0b",
                  };
                  return (
                    <g key={node.id}>
                      <rect x={x - 60} y={y - 14} width={120} height={28} rx={14} fill={colors[node.type] || "#94a3b8"} />
                      <text x={x} y={y + 4} textAnchor="middle" className="text-[11px]" fill="white" fontWeight="500">{node.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Editable node list */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Nodes</h4>
              <div className="grid grid-cols-2 gap-2">
                {wiringDraft.nodes.map((node, i) => (
                  <div key={node.id} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      node.type === "page" ? "bg-[#ec4899]" : node.type === "service" ? "bg-[#3b82f6]" : node.type === "database" ? "bg-[#8b5cf6]" : "bg-[#f59e0b]"
                    }`} />
                    <input
                      value={node.label}
                      onChange={(e) => {
                        const copy = [...wiringDraft.nodes];
                        copy[i] = { ...copy[i], label: e.target.value };
                        setWiringDraft({ ...wiringDraft, nodes: copy });
                      }}
                      className="text-xs font-medium text-[#0f172a] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none flex-1"
                    />
                    <span className="text-[10px] text-[#94a3b8]">{node.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable edge list */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Connections</h4>
              <div className="space-y-1">
                {wiringDraft.edges.map((edge, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-[#0f172a]">{edge.from}</span>
                    <ArrowRight className="w-3 h-3 text-[#94a3b8]" />
                    <span className="text-xs font-medium text-[#0f172a]">{edge.to}</span>
                    <input
                      value={edge.label}
                      onChange={(e) => {
                        const copy = [...wiringDraft.edges];
                        copy[i] = { ...copy[i], label: e.target.value };
                        setWiringDraft({ ...wiringDraft, edges: copy });
                      }}
                      className="text-[10px] text-[#64748b] bg-transparent border-b border-transparent focus:border-[#ec4899] focus:outline-none flex-1 ml-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => { await advanceStage(); runCodeGeneration(); }}
              disabled={saving || loading || streaming}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {streaming ? "Generating Code..." : "Generate Code"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderCodeStep = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Streaming content */}
      {streaming && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Loader2 className="w-4 h-4 animate-spin text-[#ec4899]" />
            Generating code...
          </div>
          <pre className="text-xs font-mono text-[#0f172a] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 max-h-60 overflow-auto whitespace-pre-wrap">
            {streamingContent}
          </pre>
        </div>
      )}

      {!codeDraft && !streaming && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3">
          <Zap className="w-10 h-10 text-[#ec4899] mx-auto" />
          <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Generate Code</h3>
          <p className="text-sm text-[#64748b]">Generate a complete project scaffold with working code.</p>
          <button
            onClick={runCodeGeneration}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Code
          </button>
        </div>
      )}

      {codeDraft && !streaming && (
        <>
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f172a]">Generated Code</h2>
              <div className="flex items-center gap-2">
                <button onClick={runCodeGeneration} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
                <button onClick={handleSave} disabled={saving} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                  <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* File tree */}
            <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                Files ({codeDraft.files.length})
              </div>
              <div className="divide-y divide-[#e2e8f0] max-h-[300px] overflow-y-auto">
                {codeDraft.files.map((file, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer transition"
                      onClick={() => document.getElementById(`file-${i}`)?.scrollIntoView({ behavior: "smooth" })}
                    >
                      <FileCode className="w-3.5 h-3.5 text-[#64748b]" />
                      {file.path}
                    </div>
                    {i === 0 && (
                      <div id="file-0" className="px-3 pb-3">
                        <div className="bg-[#1e293b] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                          <CodePanel code={codeDraft.files[0].content} language="typescript" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* README */}
            {codeDraft.readme && (
              <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-2 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  README
                </div>
                <pre className="p-4 text-xs font-mono text-[#0f172a] whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {codeDraft.readme}
                </pre>
              </div>
            )}

            {/* Download all */}
            <button
              onClick={() => {
                const allContent = codeDraft.files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n");
                const blob = new Blob([allContent], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.title.replace(/\s+/g, "_").toLowerCase()}_code.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition shadow-sm"
            >
              <Download className="w-4 h-4" /> Download All Files
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[#f8fafc]">
      {/* Breadcrumb bar */}
      <div className="bg-white border-b border-[#e2e8f0] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((s, i) => {
            const m = STAGE_META[s];
            const current = s === stage;
            const done = stageIndex(stage) > i;
            return (
              <div key={s} className="flex items-center">
                {i > 0 && <div className="w-6 h-px bg-[#e2e8f0] mx-1" />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  done ? "bg-[#ec4899] text-white" : current ? "bg-[#f8fafc] text-[#0f172a] border border-[#e2e8f0]" : "text-[#64748b]"
                }`}>
                  {done ? <Check className="w-3 h-3" /> : <m.icon className="w-3 h-3" />}
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {project && stage !== "idea" && (
            <>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-lg transition shadow-sm">
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => router.push("/sandbox")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] hover:text-red-600 rounded-lg transition">
                <RefreshCw className="w-3.5 h-3.5" /> New
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Stage title */}
      <div className="px-6 pt-4 pb-2 shrink-0">
        <h1 className="text-xl font-bold text-[#0f172a]">{project.title}</h1>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {stage === "idea" && renderIdeaStep()}
        {stage === "analyzed" && renderAnalysisStep()}
        {stage === "components" && renderComponentsStep()}
        {stage === "wiring" && renderWiringStep()}
        {stage === "code" && renderCodeStep()}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function NewProjectForm({ onCreate }: { onCreate: (p: SandboxProject) => void }) {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("capstone_token");
      const res = await fetch("/api/sandbox/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: idea.trim().slice(0, 60), rawIdea: idea.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const { project } = await res.json();
      onCreate(project);
    } catch {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-white to-[#fdf2f8] p-8">
      <div className="max-w-xl w-full space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#0f172a]">New Project</h1>
          <p className="text-sm text-[#64748b]">Describe what you want to build.</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. A flashcard app with spaced repetition..."
            rows={4}
            maxLength={2000}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] resize-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading || !idea.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] rounded-xl transition shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] resize-none"
      />
    </div>
  );
}

function EditableList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] shrink-0" />
            <input
              value={item}
              onChange={(e) => {
                const copy = [...items];
                copy[i] = e.target.value;
                onChange(copy);
              }}
              className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
            />
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-[#94a3b8] hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...items, ""])}
          className="text-xs text-[#ec4899] hover:text-[#db2777] font-medium"
        >
          + Add item
        </button>
      </div>
    </div>
  );
}
