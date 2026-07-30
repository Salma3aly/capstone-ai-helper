"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Lightbulb, Code, ArrowRight } from "lucide-react";
import { AiAvatar } from "@/components/AiAvatar";

const EXAMPLES = [
  "A flashcard app that uses spaced repetition to help me study for exams",
  "A group expense tracker that splits bills and sends reminders",
  "A personal dashboard that shows weather, calendar, and to-do list",
  "A recipe manager that suggests meals based on what's in my fridge",
];

export default function SandboxLanding() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleStart = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError("");
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Failed (${res.status})` }));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      const { project } = await res.json();
      router.push(`/sandbox/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-white to-[#fdf2f8] p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <AiAvatar size={72} />
          <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">
            Build your idea with AI
          </h1>
          <p className="text-[#64748b] text-base max-w-md mx-auto">
            Describe what you want to build — I&apos;ll analyze it, design the architecture, and generate working code.
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm p-6 space-y-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. A habit tracker that uses streaks and reminders to help me build daily routines..."
            rows={4}
            maxLength={2000}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent resize-none text-[#0f172a] placeholder-[#94a3b8]"
          />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={loading || !idea.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] disabled:cursor-not-allowed rounded-xl transition shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Creating..." : "Start Building"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">Try an example</p>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setIdea(ex)}
                className="text-left text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 hover:border-[#ec4899] hover:text-[#ec4899] transition text-pretty"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Analyze
          </span>
          <span className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5" /> Components
          </span>
          <span className="flex items-center gap-1.5">
            ⚡ Wiring
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Code
          </span>
        </div>
      </div>
    </div>
  );
}
