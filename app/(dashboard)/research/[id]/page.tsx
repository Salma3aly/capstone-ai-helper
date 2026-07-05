"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle,
  Microscope,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { getResearchPaper, type ResearchPaper } from "@/lib/research/storage";
import { CopyButton } from "@/components/research/CopyButton";
import { getAuthHeaders } from "@/lib/research/client";

const SUGGESTED_QUESTIONS = [
  "Explain the methodology in simple terms",
  "What are the main limitations of this study?",
  "How could I use this in my capstone project?",
];

function PaperChat({ paper }: { paper: ResearchPaper }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoReplyDone, setAutoReplyDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (autoReplyDone) return;
    setAutoReplyDone(true);
    const msg =
      "I've just analyzed this research paper. Can you help me understand the key concepts in simple terms?";
    setMessages([{ role: "user", content: msg }]);
    sendToAI(msg, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToAI = async (text: string, isAuto = false) => {
    setLoading(true);
    replyRef.current = "";
    try {
      const res = await fetch("/api/research/paper-chat", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messages: isAuto ? [] : messages,
          paperContext: paper.originalText.slice(0, 4000),
          userMessage: text,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        replyRef.current += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: replyRef.current };
          return updated;
        });
      }
    } catch {
      if (!isAuto) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't process that. Try again." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    sendToAI(message);
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] lg:min-h-0">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#ec4899]" />
        <span className="text-sm font-semibold text-gray-800">AI Paper Tutor</span>
        <span className="text-xs text-gray-400 ml-auto hidden sm:inline">This paper only</span>
      </div>
      <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap gap-1">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-full bg-[#fdf2f8] text-[#ec4899] hover:bg-[#fce7f3] transition disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#ec4899] text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content || (loading && i === messages.length - 1 ? "▊" : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-gray-200 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this paper..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#ec4899] transition"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function ResearchPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("findings");

  useEffect(() => {
    const p = getResearchPaper(id);
    if (p) setPaper(p);
    else setNotFound(true);
  }, [id]);

  if (notFound) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-gray-800">Paper not found</h2>
        <p className="text-sm text-gray-500 mt-2">This research analysis may have been deleted.</p>
        <Link
          href="/research"
          className="inline-block mt-4 text-sm text-[#ec4899] hover:text-[#db2777] font-semibold"
        >
          ← Back to Research Assistant
        </Link>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="p-8 text-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ec4899] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "abstract", label: "Abstract", icon: FileText },
    { id: "objective", label: "Objective", icon: CheckCircle },
    { id: "methodology", label: "Methodology", icon: Microscope },
    { id: "findings", label: "Key Findings", icon: Sparkles },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)]">
      <div className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white flex flex-col lg:h-full">
        <PaperChat paper={paper} />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <Link
            href="/research"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#db2777] font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Research
          </Link>

          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-snug">
              {paper.title.length > 100 ? paper.title.slice(0, 100) + "..." : paper.title}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Analyzed{" "}
              {new Date(paper.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {paper.projectContext && (
              <p className="text-sm text-gray-500 mt-1">
                Project: <span className="italic">{paper.projectContext}</span>
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              Verify all facts against the original paper before using in your portfolio.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[80px] py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1 ${
                    isActive
                      ? "bg-[#ec4899] text-white shadow-sm scale-[1.02]"
                      : "text-gray-500 hover:text-gray-800 hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === "abstract" && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
                  Original Text
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {paper.originalText}
                </p>
              </div>
            )}
            {activeTab === "objective" && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Research Objective
                  </h3>
                  <CopyButton text={paper.summary.objective} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{paper.summary.objective}</p>
              </div>
            )}
            {activeTab === "methodology" && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                    Methodology &amp; Materials
                  </h3>
                  <CopyButton text={paper.summary.methodology} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{paper.summary.methodology}</p>
              </div>
            )}
            {activeTab === "findings" && (
              <div className="bg-white border border-[#fbcfe8] rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">
                    Key Findings &amp; Metrics
                  </h3>
                  <CopyButton text={paper.summary.findings} />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{paper.summary.findings}</p>
              </div>
            )}
          </div>

          {paper.summary.capstoneJustification && (
          <div className="bg-gradient-to-r from-[#fdf2f8] to-[#fce7f3] border border-[#fbcfe8] rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-bold text-[#ec4899] flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-[#ec4899]" />
                Jury Portfolio Justification
              </h3>
              <CopyButton text={paper.summary.capstoneJustification} />
            </div>
            <p className="text-sm text-slate-800 leading-relaxed italic">
              &ldquo;{paper.summary.capstoneJustification}&rdquo;
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
