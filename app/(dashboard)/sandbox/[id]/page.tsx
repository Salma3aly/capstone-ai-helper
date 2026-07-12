"use client";
import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, AlertCircle, ArrowLeft, ArrowRight,
  Check, Save, FileCode, Share2, Download, Trash2, RefreshCw,
  Edit3, Braces, Box, Network, Zap, Search, ChevronDown, X,
} from "lucide-react";
import type {
  SandboxProject, SandboxStage, IdeaAnalysis,
  ComponentRecommendation, WiringDiagram, CodeGeneration, WiringItem,
} from "@/lib/sandbox/types";
import {
  getProject, updateProject, createProject,
} from "@/lib/sandbox/store";
import { BreadboardSimulator } from "@/components/sandbox/BreadboardSimulator";
import { BOARD_COMPONENTS, COMPONENTS } from "@/lib/sandbox/components";
import type { RamProduct } from "@/lib/sandbox/ram";

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



  // ── Hardware wiring state ─────────────────────────────────────────
  const [hardwareBoard, setHardwareBoard] = useState("");
  const [hardwareSensors, setHardwareSensors] = useState<string[]>([]);
  const [sensorNames, setSensorNames] = useState<Record<string, string>>({});
  const [hardwareWiring, setHardwareWiring] = useState<WiringItem[]>([]);
  const [hoveredConnection, setHoveredConnection] = useState<{ component: string; connectionIndex: number } | null>(null);
  const [editFeedback, setEditFeedback] = useState("");
  const [genHardwareLoading, setGenHardwareLoading] = useState(false);
  const [hwSearch, setHwSearch] = useState("");
  const [hwCat, setHwCat] = useState("");
  const [hwOpen, setHwOpen] = useState(false);

  const hwDropdownRef = useRef<HTMLDivElement>(null);

  // ── RAM components ────────────────────────────────────────────────
  const [ramProducts, setRamProducts] = useState<RamProduct[]>([]);
  const [ramLoading, setRamLoading] = useState(false);

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
        if (p.hardwareBoard) setHardwareBoard(p.hardwareBoard);
        if (p.hardwareSensors) setHardwareSensors(p.hardwareSensors);
        if (p.sensorNames) setSensorNames(p.sensorNames);
        if (p.hardwareWiring) setHardwareWiring(p.hardwareWiring);
      })
      .catch(() => setError("Failed to load project"))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Close HW dropdown on outside click ──────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (hwDropdownRef.current && !hwDropdownRef.current.contains(e.target as Node)) {
        setHwOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Load RAM products ────────────────────────────────────────────
  useEffect(() => {
    setRamLoading(true);
    fetch("/api/ram-components")
      .then((r) => r.json())
      .then((data: RamProduct[]) => setRamProducts(data))
      .catch(() => {})
      .finally(() => setRamLoading(false));
  }, []);

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
    else if (stage === "wiring") {
      updates.wiring = wiringDraft;
      updates.hardwareBoard = hardwareBoard;
      updates.hardwareSensors = hardwareSensors;
      updates.sensorNames = sensorNames;
      updates.hardwareWiring = hardwareWiring;
    }
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
  }, [project, stage, analysisDraft, componentsDraft, wiringDraft, codeDraft, hardwareBoard, hardwareSensors, sensorNames, hardwareWiring]);

  const goBackStage = useCallback(async () => {
    if (!project) return;
    const prevIdx = stageIndex(stage) - 1;
    if (prevIdx < 0) return;
    const prevStage = STAGE_ORDER[prevIdx];
    setSaving(true);
    try {
      const updated = await updateProject(project.id, { stage: prevStage });
      setProject(updated);
    } catch {
      setError("Failed to go back");
    } finally {
      setSaving(false);
    }
  }, [project, stage]);

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
      const updated = await updateProject(project.id, { analysis, title: analysis.title || project.title, stage: "analyzed" });
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
      // Software wiring diagram
      const res = await fetch("/api/sandbox/wiring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea, components: componentsDraft }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const wiring = data.wiring as WiringDiagram;
      setWiringDraft(wiring);
      await updateProject(project.id, { wiring, stage: "wiring" });

      // Auto-recommend hardware
      const recRes = await fetch("/api/sandbox/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea }),
      });
      const recData = await recRes.json();
      if (recData.error) { setError(recData.error); return; }
      const { boardId, sensorIds, why } = recData;
      setHardwareBoard(boardId);
      const nameMap: Record<string, string> = {};
      sensorIds.forEach((id: string) => {
        const comp = BOARD_COMPONENTS.find((c) => c.id === id) || COMPONENTS.find((c) => c.id === id);
        if (comp) nameMap[id] = comp.name;
        else nameMap[id] = id;
      });
      setSensorNames(nameMap);
      setHardwareSensors(sensorIds);

      // Auto-generate hardware wiring
      const sensorDisplayNames = sensorIds.map((id: string) =>
        nameMap[id] || COMPONENTS.find((c: any) => c.id === id)?.name || id
      );
      const genRes = await fetch("/api/sandbox/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: project.rawIdea, boardId, sensorIds, sensorDisplayNames }),
      });
      const genData = await genRes.json();
      if (!genData.error) {
        setHardwareWiring(genData.wiring || []);
      }
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

  // ── Hardware wiring generate ─────────────────────────────────────
  const generateHardwareWiring = async () => {
    if (!project || !hardwareBoard || hardwareSensors.length === 0) return;
    setGenHardwareLoading(true);
    setError("");
    try {
      // Resolve display names for all selected sensors (including RAM ones)
      const sensorDisplayNames = hardwareSensors.map((id) =>
        sensorNames[id] || COMPONENTS.find((c) => c.id === id)?.name || id.replace(/^ram-/, "").replace(/-/g, " ")
      );
      const res = await fetch("/api/sandbox/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: project.rawIdea,
          boardId: hardwareBoard,
          sensorIds: hardwareSensors,
          sensorDisplayNames,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setHardwareWiring(data.wiring || []);
    } catch {
      setError("Hardware wiring generation failed.");
    } finally {
      setGenHardwareLoading(false);
    }
  };

  // ── Regenerate from edit feedback ────────────────────────────────
  const handleEditRegenerate = async () => {
    if (!project || !editFeedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sandbox/wiring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: `${project.rawIdea}\n\nUser edit: ${editFeedback}`,
          components: componentsDraft,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setWiringDraft(data.wiring as WiringDiagram);
      setEditFeedback("");
    } catch {
      setError("Regeneration failed.");
    } finally {
      setLoading(false);
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
      if (stage === "wiring") {
        updates.wiring = wiringDraft!;
        updates.hardwareBoard = hardwareBoard;
        updates.hardwareSensors = hardwareSensors;
        updates.sensorNames = sensorNames;
        updates.hardwareWiring = hardwareWiring;
      }
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

            <EditableField label="Problem Statement" value={analysisDraft.problem_statement || ""} onChange={(v) => setAnalysisDraft({ ...analysisDraft, problem_statement: v })} />
            <EditableField label="Target User" value={analysisDraft.target_user || ""} onChange={(v) => setAnalysisDraft({ ...analysisDraft, target_user: v })} />

            <EditableList label="Core Features" items={analysisDraft.core_features ?? []} onChange={(items) => setAnalysisDraft({ ...analysisDraft, core_features: items })} />
            <EditableList label="Out of Scope" items={analysisDraft.out_of_scope ?? []} onChange={(items) => setAnalysisDraft({ ...analysisDraft, out_of_scope: items })} />
            <EditableList label="Clarifying Questions" items={analysisDraft.clarifying_questions ?? []} onChange={(items) => setAnalysisDraft({ ...analysisDraft, clarifying_questions: items })} />
          </div>

          <div className="flex items-center justify-between">
            <button onClick={goBackStage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] rounded-lg transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
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
                <div><span className="text-[#64748b] text-xs">Frontend</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack?.frontend || "—"}</p></div>
                <div><span className="text-[#64748b] text-xs">Backend</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack?.backend || "—"}</p></div>
                <div><span className="text-[#64748b] text-xs">Database</span><p className="font-medium text-[#0f172a]">{componentsDraft.suggested_stack?.database || "—"}</p></div>
              </div>
            </div>

            {/* Pages */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-2">Pages</h4>
              <div className="space-y-1.5">
                {(componentsDraft.pages ?? []).map((p, i) => (
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
                {(componentsDraft.data_models ?? []).map((m, i) => (
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
                {(componentsDraft.integrations ?? []).map((int, i) => (
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

          <div className="flex items-center justify-between">
            <button onClick={goBackStage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] rounded-lg transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
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

  const renderWiringStep = () => {
    const boardComp = BOARD_COMPONENTS.find((c) => c.id === hardwareBoard);
    const selectedBoardName = boardComp?.name || "";
    const sensorDisplayName = (id: string) =>
      sensorNames[id] || BOARD_COMPONENTS.find((c) => c.id === id)?.name || COMPONENTS.find((c) => c.id === id)?.name || id.replace(/^ram-/, "").replace(/-/g, " ");

    // Layered dynamic layout for Architecture Diagram
    const getLayerIndex = (type: string): number => {
      const t = type.toLowerCase();
      if (t.includes("sensor")) return 0;
      if (t.includes("page") || t === "ui" || t === "client") return 1;
      if (t.includes("db") || t.includes("database") || t === "external" || t === "api") return 3;
      return 2; // Default for controller, system, broker, service, server, etc.
    };

    const nodePositions = new Map<string, { x: number; y: number }>();
    let viewW = 800;
    let viewH = 520;
    const layerInfo = [
      { y: 90, label: "Sensors / Input" },
      { y: 200, label: "Client / UI" },
      { y: 310, label: "Services / Logic" },
      { y: 420, label: "Data / External" },
    ];
    if (wiringDraft) {
      const nodesByLayer: Record<number, typeof wiringDraft.nodes> = { 0: [], 1: [], 2: [], 3: [] };
      wiringDraft.nodes.forEach((node) => {
        const layer = getLayerIndex(node.type);
        nodesByLayer[layer].push(node);
      });

      const maxNodesPerLayer = Math.max(
        ...Object.values(nodesByLayer).map((n) => n.length), 1
      );
      viewW = Math.max(800, maxNodesPerLayer * 200);

      [0, 1, 2, 3].forEach((layerIndex) => {
        const nodesInLayer = nodesByLayer[layerIndex];
        const count = nodesInLayer.length;
        nodesInLayer.forEach((node, k) => {
          const x = (viewW / (count + 1)) * (k + 1);
          const y = layerInfo[layerIndex].y;
          nodePositions.set(node.id, { x, y });
        });
      });
    }

    // RAM filter
    const filteredRam = ramProducts.filter((p) => {
      if (hwSearch) { const q = hwSearch.toLowerCase(); if (!p.name.toLowerCase().includes(q)) return false; }
      if (hwCat && p.category !== hwCat) return false;
      return true;
    }).slice(0, 200);
    const ramCats = [...new Set(ramProducts.map((p) => p.category))].sort();

    const toggleRamSensor = (p: RamProduct) => {
      const id = `ram-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
      if (hardwareSensors.includes(id)) {
        setHardwareSensors(hardwareSensors.filter((s) => s !== id));
      } else {
        setHardwareSensors([...hardwareSensors, id]);
        setSensorNames({ ...sensorNames, [id]: p.name });
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {!wiringDraft && (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3">
            <Network className="w-10 h-10 text-[#ec4899] mx-auto" />
            <h3 className="text-lg font-semibold text-[#0f172a]">Ready to Design Architecture</h3>
            <p className="text-sm text-[#64748b]">AI will design the software architecture and recommend matching hardware components.</p>
            <button
              onClick={runWiring}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] rounded-xl transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Generating Everything..." : "Generate Full Wiring"}
            </button>
          </div>
        )}

        {wiringDraft && (
          <>
              {/* Architecture Diagram card */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#0f172a]">Architecture Diagram</h2>
                  <button onClick={runWiring} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  {/* SVG diagram */}
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 min-h-[400px] overflow-x-auto">
                    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-auto" style={{ minWidth: '750px', maxHeight: '560px' }}>
                      <defs>
                        <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
                          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                        </filter>
                        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                          <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
                        </marker>
                      </defs>

                      {/* Layer background zones */}
                      {layerInfo.map((layer, i) => (
                        <g key={`zone-${i}`}>
                          <rect x={0} y={layer.y - 35} width={viewW} height={70} fill={i % 2 === 0 ? "#fef2f2" : "#fff1f2"} rx="6" />
                          <rect x={0} y={layer.y - 35} width={3} height={70} fill={["#f43f5e", "#ec4899", "#8b5cf6", "#22c55e"][i % 4]} rx="1.5" />
                          <text x={10} y={layer.y - 16} textAnchor="start" className="text-[7px] font-bold uppercase tracking-wider" fill="#94a3b8">{layer.label}</text>
                        </g>
                      ))}

                      {/* Edge connections */}
                      {wiringDraft.edges.map((edge, i) => {
                        const fromNode = wiringDraft.nodes.find((n) => n.id === edge.from);
                        const toNode = wiringDraft.nodes.find((n) => n.id === edge.to);
                        if (!fromNode || !toNode) return null;
                        const fromPt = nodePositions.get(fromNode.id);
                        const toPt = nodePositions.get(toNode.id);
                        if (!fromPt || !toPt) return null;

                        const fx = fromPt.x, fy = fromPt.y;
                        const tx = toPt.x, ty = toPt.y;
                        const dx = tx - fx, dy = ty - fy;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const cos = len > 0 ? Math.abs(dx) / len : 1;
                        const sin = len > 0 ? Math.abs(dy) / len : 0;
                        const off = 16 * sin + 68 * cos;
                        const sfx = len > 40 ? fx + (dx / len) * off : fx;
                        const sfy = len > 40 ? fy + (dy / len) * off : fy;
                        const stx = len > 40 ? tx - (dx / len) * (off + 5) : tx;
                        const sty = len > 40 ? ty - (dy / len) * (off + 5) : ty;

                        const cpx = (sfx + stx) / 2;
                        const cpy = (sfy + sty) / 2;
                        const yOffset = Math.abs(ty - fy) > 10 ? Math.abs(ty - fy) * 0.25 : 25;
                        const midY = (sfy + sty) / 2 - yOffset;

                        const mx = stx - (stx - sfx) * 0.5;
                        const my = sty - (sty - sfy) * 0.5;
                        const labelW = edge.label.length * 5.5 + 12;
                        const labelH = 18;

                        return (
                          <g key={i}>
                            <path d={`M ${sfx} ${sfy} Q ${cpx} ${midY} ${stx} ${sty}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                            <rect x={mx - labelW / 2} y={my - labelH / 2} width={labelW} height={labelH} fill="#ffffff" rx="4" stroke="#e2e8f0" strokeWidth="0.5" filter="url(#shadow)" />
                            <text x={mx} y={my + 4} textAnchor="middle" className="text-[8.5px] font-semibold" fill="#475569">{edge.label}</text>
                          </g>
                        );
                      })}

                      {/* Render nodes */}
                      {wiringDraft.nodes.map((node) => {
                        const pos = nodePositions.get(node.id);
                        if (!pos) return null;
                        const { x, y } = pos;
                        const colors: Record<string, string> = {
                          page: "#db2777", service: "#2563eb", database: "#7c3aed",
                          external: "#d97706",
                        };
                        const nodeType = node.type.toLowerCase();
                        const nodeColor = colors[nodeType] || "#475569";
                        const truncLabel = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;

                        return (
                          <g key={node.id}>
                            <rect x={x - 72} y={y - 17} width={144} height={34} rx={9} fill={nodeColor} filter="url(#shadow)" />
                            <rect x={x - 72} y={y - 17} width={144} height={3} rx={1.5} fill="white" fillOpacity="0.2" />
                            <text x={x} y={y + 5} textAnchor="middle" className="text-[10px] font-bold" fill="white">{truncLabel}</text>
                          </g>
                        );
                      })}

                      {/* Legend */}
                      <g transform={`translate(12, ${viewH - 28})`}>
                        <rect x={0} y={0} width={200} height={22} rx={6} fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" filter="url(#shadow)" />
                        {Object.entries({ page: "#db2777", service: "#2563eb", database: "#7c3aed", external: "#d97706" }).map(([key, color], i) => (
                          <g key={key} transform={`translate(${6 + i * 48}, 6)`}>
                            <rect x={0} y={0} width={8} height={8} rx={2} fill={color} />
                            <text x={11} y={7} className="text-[6px] font-semibold" fill="#64748b">{key}</text>
                          </g>
                        ))}
                      </g>
                    </svg>
                  </div>

                  {/* Edit & Regenerate panel — under the diagram */}
                  <div className="border-t border-[#e2e8f0] pt-5 space-y-3">
                    <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-[#ec4899]" /> Edit Architecture
                    </h3>
                    <p className="text-xs text-[#64748b] leading-relaxed">
                      Tell me what to change in the architecture diagram, then click Apply &amp; Regenerate (e.g., &quot;Add an auth service&quot; or &quot;Add a notifications page&quot;).
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <textarea
                        value={editFeedback}
                        onChange={(e) => setEditFeedback(e.target.value)}
                        placeholder="e.g. Add auth page, swap DHT22 for BME280..."
                        rows={2}
                        className="flex-1 border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#ec4899] resize-none text-[#0f172a]"
                      />
                      <button
                        onClick={handleEditRegenerate}
                        disabled={loading || !editFeedback.trim()}
                        className="px-5 py-3 text-xs font-semibold text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] disabled:cursor-not-allowed rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 self-end sm:self-stretch min-w-[160px]"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Apply &amp; Regenerate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">Nodes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {wiringDraft.nodes.map((node, i) => (
                      <div key={node.id} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          node.type === "page" ? "bg-[#ec4899]" : node.type === "service" ? "bg-[#3b82f6]" : node.type === "database" ? "bg-[#8b5cf6]" : node.type === "external" ? "bg-[#d97706]" : "bg-[#f59e0b]"
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

            {/* Hardware Wiring — select or AI-recommended */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0f172a] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#ec4899]" /> Hardware Wiring
                </h2>
                <div className="flex items-center gap-2">
                  {selectedBoardName && hardwareSensors.length > 0 && (
                    <button onClick={runWiring} disabled={loading} className="text-xs text-[#64748b] hover:text-[#ec4899] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> AI Recommend
                    </button>
                  )}
                </div>
              </div>

              {/* Board picker */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">Board</label>
                <select
                  value={hardwareBoard}
                  onChange={(e) => setHardwareBoard(e.target.value)}
                  className="w-full border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#ec4899] bg-white"
                >
                  <option value="">Select a board...</option>
                  {BOARD_COMPONENTS.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Sensor picker (RAM-powered) */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#64748b] mb-1">
                  Sensors & Modules
                  {hardwareSensors.length > 0 && <span className="font-normal lowercase ml-1">({hardwareSensors.length} selected)</span>}
                </label>
                <div className="relative" ref={hwDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setHwOpen(!hwOpen)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 border border-[#e2e8f0] rounded-lg text-xs text-left bg-white hover:border-[#fbcfe8] transition focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
                  >
                    <Search className="w-3 h-3 text-[#94a3b8] shrink-0" />
                    <span className="flex-1 text-[#94a3b8]">Search components...</span>
                    <span className="text-[10px] text-[#94a3b8]">{ramProducts.length} in store</span>
                    <ChevronDown className={`w-3 h-3 text-[#94a3b8] transition ${hwOpen ? "rotate-180" : ""}`} />
                  </button>

                  {hwOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-[#e2e8f0] rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-[#e2e8f0] space-y-1.5">
                        <input
                          type="text"
                          value={hwSearch}
                          onChange={(e) => setHwSearch(e.target.value)}
                          placeholder="Search by name..."
                          className="w-full border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
                          autoFocus
                        />
                        <select
                          value={hwCat}
                          onChange={(e) => setHwCat(e.target.value)}
                          className="w-full text-xs border border-[#e2e8f0] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#64748b]"
                        >
                          <option value="">All categories</option>
                          {ramCats.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredRam.length === 0 ? (
                          <p className="text-xs text-[#94a3b8] text-center py-4">No components found</p>
                        ) : (
                          filteredRam.map((p, i) => {
                            const id = `ram-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
                            const sel = hardwareSensors.includes(id);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => toggleRamSensor(p)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left border-b border-[#f8fafc] last:border-0 transition ${
                                  sel ? "bg-[#fdf2f8] text-[#db2777] font-medium" : "hover:bg-[#f8fafc] text-[#64748b]"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sel ? "bg-[#ec4899]" : "bg-[#cbd5e1]"}`} />
                                <span className="flex-1 truncate">{p.name}</span>
                                <span className="text-[9px] text-[#94a3b8] shrink-0">{p.category}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected sensor chips */}
                {hardwareSensors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hardwareSensors.map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 bg-[#fdf2f8] text-[#db2777] text-[10px] px-1.5 py-0.5 rounded border border-[#fbcfe8] max-w-[200px]">
                        <span className="truncate">{sensorDisplayName(id)}</span>
                        <button onClick={() => setHardwareSensors(hardwareSensors.filter((s) => s !== id))} className="shrink-0 hover:text-[#db2777]">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate hardware wiring */}
              <button
                onClick={generateHardwareWiring}
                disabled={genHardwareLoading || !hardwareBoard || hardwareSensors.length === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] disabled:cursor-not-allowed rounded-lg transition"
              >
                {genHardwareLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {genHardwareLoading ? "Generating Wiring..." : "Generate Hardware Wiring"}
              </button>

              {/* BreadboardSimulator — show whenever we have a board + sensors */}
              {selectedBoardName && (
                <BreadboardSimulator
                  boardName={selectedBoardName}
                  sensors={hardwareSensors.map((id) => sensorDisplayName(id))}
                  wiring={hardwareWiring}
                  hoveredConnection={hoveredConnection}
                  onHoverConnection={setHoveredConnection}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={goBackStage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] rounded-lg transition">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
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
  };

  const renderCodeStep = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Streaming content */}
      {streaming && (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Loader2 className="w-4 h-4 animate-spin text-[#ec4899]" />
            Generating code...
          </div>
          <pre className="bg-[#0f172a] text-emerald-400 p-4 text-xs font-mono leading-relaxed rounded-lg max-h-60 overflow-auto whitespace-pre-wrap">
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

            {/* Combined code — single block like examples page */}
            <pre className="bg-[#0f172a] text-emerald-400 p-4 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono max-h-[500px] overflow-y-auto whitespace-pre-wrap">
              <code>{codeDraft.files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n")}</code>
            </pre>

            {/* README */}
            {codeDraft.readme && (
              <pre className="bg-[#0f172a] text-emerald-400 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {codeDraft.readme}
              </pre>
            )}

            <div className="flex items-center gap-3">
              <button onClick={goBackStage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] rounded-lg transition">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

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
        <h1 className="text-xl font-bold text-[#0f172a]">{project.analysis?.title || project.title}</h1>
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
