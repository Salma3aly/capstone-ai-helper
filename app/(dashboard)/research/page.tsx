"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  CheckCircle,
  BrainCircuit,
  Microscope,
  Info,
  Link as LinkIcon,
  Loader,
  AlertTriangle,
  BookmarkPlus,
  Trash2,
  Upload,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { CopyButton } from "@/components/research/CopyButton";
import { FindPapersGuide } from "@/components/research/FindPapersGuide";
import { ResearchSummarySkeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getAllResearchPapers,
  saveResearchPaper,
  deleteResearchPaper,
  type ResearchPaper,
} from "@/lib/research/storage";
import { getAuthHeaders, getAuthHeadersOnly } from "@/lib/research/client";
import { MAX_RESEARCH_CHARS, type ResearchSummary } from "@/lib/research/types";
import { assessImportQuality } from "@/lib/research/text-quality";

type InputMode = "paste" | "link" | "upload" | "search";

interface ArxivResult {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  link: string;
  category: string;
}

function buildPortfolioText(summary: ResearchSummary, inputText: string) {
  const sections = ["=== RESEARCH SUMMARY FOR CAPSTONE PORTFOLIO ===", ""];
  const overview = summary.overview || summary.abstractText;
  if (overview) sections.push("OVERVIEW", overview, "");
  sections.push("OBJECTIVE", summary.objective, "");
  sections.push("METHODOLOGY", summary.methodology, "");
  sections.push("KEY FINDINGS", summary.findings, "");
  if (summary.capstoneJustification) {
    sections.push("JURY PORTFOLIO JUSTIFICATION", summary.capstoneJustification, "");
  }
  sections.push("---", "Source excerpt:", inputText.slice(0, 500) + (inputText.length > 500 ? "..." : ""));
  return sections.join("\n");
}

export default function ResearchPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [inputText, setInputText] = useState("");
  const [url, setUrl] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [simpleLanguage, setSimpleLanguage] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [savedPapers, setSavedPapers] = useState<ResearchPaper[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [inputTruncated, setInputTruncated] = useState(false);
  const [importQuality, setImportQuality] = useState<"full" | "metadata_only" | "insufficient" | null>(null);
  const [qualityMessage, setQualityMessage] = useState("");
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ArxivResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSavedPapers(getAllResearchPapers());
    try {
      const stored = localStorage.getItem("capstone_project_context");
      if (stored) setProjectContext(stored);
    } catch {}
  }, []);

  const handleInputChange = useCallback((text: string, source?: string) => {
    const trimmed = text.length > MAX_RESEARCH_CHARS ? text.slice(0, MAX_RESEARCH_CHARS) : text;
    setInputText(trimmed);
    setError("");
    const assessment = assessImportQuality(trimmed);
    setImportQuality(assessment.quality);
    setQualityMessage(assessment.reason || "");
    if (trimmed.length >= 50) {
      const qualityNote =
        assessment.quality === "full"
          ? "Ready to summarize"
          : assessment.quality === "metadata_only"
            ? "Citation only — paste abstract"
            : "Need more text";
      setImportSuccess(
        `Paper text loaded (${trimmed.length.toLocaleString()} characters)${source ? ` · ${source}` : ""} · ${qualityNote}`
      );
    }
  }, []);

  const handleFile = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");
    if (!isPdf && !isText) { setError("Please upload a .txt, .md, or .pdf file."); return; }
    setUploadedFileName(file.name);
    setUploading(true);
    setError("");
    setImportSuccess("");

    if (isPdf) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/research/extract-pdf", {
          method: "POST", headers: getAuthHeadersOnly(), body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to extract PDF");
        handleInputChange(data.text, data.source === "arxiv-api" ? "arXiv" : "PDF");
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to read PDF."); }
      finally { setUploading(false); }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => { const text = event.target?.result as string; if (text) handleInputChange(text, "file"); setUploading(false); };
    reader.onerror = () => { setError("Failed to read file."); setUploading(false); };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleUrlFetch = async () => {
    if (!url.trim() || fetchingUrl) return;
    setFetchingUrl(true);
    setError("");
    setImportSuccess("");
    try {
      const res = await fetch("/api/research/fetch-url", {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      const sourceLabel =
        data.source === "resolver" || data.source === "doi-resolver"
          ? "academic database"
          : data.source === "meta"
            ? "web metadata"
            : "web page";
      handleInputChange(data.text, sourceLabel);
      if (data.qualityMessage) {
        setQualityMessage(data.qualityMessage);
        setImportQuality(data.quality || null);
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to fetch"); }
    finally { setFetchingUrl(false); }
  };

  const handleSummarize = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError("");
    setSummary(null);
    setInputTruncated(false);
    try {
      localStorage.setItem("capstone_project_context", projectContext);
      const res = await fetch("/api/research/summarize", {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ text: inputText, projectContext, simpleLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate summary");
      setSummary(data);
      setInputTruncated(Boolean(data.inputTruncated));
      setCurrentStep(3);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSave = () => {
    if (!summary) return;
    const paper = saveResearchPaper({ originalText: inputText, summary, projectContext: projectContext || undefined });
    setSavedPapers(getAllResearchPapers());
    setSaveMessage(`Saved! Open "${paper.title.slice(0, 40)}..." to chat with AI Paper Tutor.`);
    setTimeout(() => setSaveMessage(""), 4000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setError("");
    setSearchResults([]);
    try {
      const res = await fetch("/api/research/search", {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ query: searchQuery.trim(), maxResults: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.entries || []);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Search failed"); }
    finally { setSearching(false); }
  };

  const importSearchResult = async (entry: ArxivResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setInputMode("link");
    setUrl(entry.id);
    // auto-fetch the abstract
    setTimeout(() => {
      const btn = document.getElementById("import-search-btn");
      btn?.click();
    }, 100);
  };

  const charCount = inputText.length;
  const hasText = charCount >= 50;
  const canSummarize = hasText && importQuality === "full";

  const inputModes: { id: InputMode; label: string; icon: typeof ClipboardPaste; hint: string }[] = [
    { id: "search", label: "Search", icon: Sparkles, hint: "arXiv paper search" },
    { id: "paste", label: "Paste text", icon: ClipboardPaste, hint: "Copy abstract from Google Scholar" },
    { id: "link", label: "From link", icon: LinkIcon, hint: "arXiv, PubMed, paper pages" },
    { id: "upload", label: "Upload file", icon: Upload, hint: "PDF, .txt, or .md" },
  ];

  return (
    <div className="p-4 md:p-8 bg-gray-50/50 min-h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
            <BrainCircuit className="w-7 h-7 text-[#ec4899]" />
            Research Assistant
          </h1>
          <p className="text-base text-gray-600 mt-2 max-w-2xl">Import a paper, review the text, then generate a capstone-ready summary.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {[{ n: 1, label: "Import" }, { n: 2, label: "Review & Generate" }, { n: 3, label: "Results" }].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep >= n ? "bg-[#ec4899] text-white" : "bg-gray-200 text-gray-500"
              }`}>{currentStep > n ? <CheckCircle2 className="w-4 h-4" /> : n}</div>
              <span className={`text-sm font-medium hidden sm:inline ${currentStep >= n ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
              {n < 3 && <div className={`w-6 md:w-16 h-0.5 ${currentStep > n ? "bg-[#ec4899]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* === STEP 1: Import === */}
        {currentStep === 1 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80">
              <h2 className="text-base font-bold text-gray-800">Add your paper</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {inputModes.map(({ id, label, icon: Icon, hint }) => (
                  <button key={id} type="button" onClick={() => setInputMode(id)}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      inputMode === id ? "border-[#fbcfe8] bg-[#fdf2f8]" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${inputMode === id ? "text-[#ec4899]" : "text-gray-400"}`} />
                    <div className="text-sm font-semibold text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5 hidden md:block">{hint}</div>
                  </button>
                ))}
              </div>

              {inputMode === "search" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search arXiv papers..."
                      className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
                      disabled={searching}
                    />
                    <button type="button" onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                      className="px-5 py-3 bg-[#ec4899] text-white font-semibold rounded-lg disabled:opacity-40 flex items-center gap-2"
                    >{searching ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Search</button>
                  </div>
                  <p className="text-xs text-gray-500">Powered by <strong>arXiv</strong> open access API. Searches titles and abstracts.</p>

                  {searchResults.length > 0 && (
                    <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                      {searchResults.map((entry, i) => (
                        <button key={i} type="button" onClick={() => importSearchResult(entry)}
                          className="w-full text-left p-3 rounded-lg hover:bg-[#fdf2f8] border border-gray-100 hover:border-[#fbcfe8] transition group"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg mt-0.5">📄</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#ec4899] line-clamp-2">{entry.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{entry.authors.slice(0, 3).join(", ")}{entry.authors.length > 3 ? " et al." : ""}</p>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.summary.slice(0, 200)}...</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(entry.published).toLocaleDateString()} · {entry.category || "arXiv"}</p>
                            </div>
                            <span className="text-xs text-[#ec4899] opacity-0 group-hover:opacity-100 shrink-0 mt-1">Import →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {inputMode === "paste" && (
                <div className="space-y-3">
                  <textarea value={inputText} onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Paste the abstract or paper text here..."
                    className="w-full h-48 border border-gray-200 rounded-lg p-4 text-base outline-none focus:ring-2 focus:ring-[#ec4899] bg-white text-black resize-none"
                  />
                </div>
              )}

              {inputMode === "link" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                      placeholder="https://arxiv.org/abs/..."
                      className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
                      disabled={fetchingUrl}
                    />
                    <button type="button" onClick={handleUrlFetch} disabled={fetchingUrl || !url.trim()}
                      className="px-5 py-3 bg-[#ec4899] text-white font-semibold rounded-lg disabled:opacity-40 flex items-center gap-2"
                    id="import-search-btn"
                    >{fetchingUrl ? <Loader className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} Import</button>
                  </div>
                  <p className="text-sm text-gray-500">Works best with <strong>arXiv</strong> links.</p>
                </div>
              )}

              {inputMode === "upload" && (
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition ${dragOver ? "border-[#fbcfe8] bg-[#fdf2f8]" : "border-gray-300 bg-gray-50"}`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader className="w-8 h-8 text-[#ec4899] animate-spin" />
                      <p className="text-base font-medium text-gray-700">Extracting text from {uploadedFileName || "file"}...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-base font-medium text-gray-700">Drag & drop a PDF here</p>
                      <p className="text-sm text-gray-500 mt-1">or click to browse (.pdf, .txt, .md)</p>
                      <label className="inline-block mt-4 px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
                        Choose file <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </>
                  )}
                </div>
              )}

              {importQuality === "metadata_only" && qualityMessage && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <strong>Abstract not found.</strong> {qualityMessage}
                  </div>
                </div>
              )}
              {importSuccess && importQuality === "full" && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 font-medium">{importSuccess}</p>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCurrentStep(2)} disabled={!hasText}
                  className="px-6 py-2.5 bg-[#ec4899] text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >Next <ArrowRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 2: Review & Generate === */}
        {currentStep === 2 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Review imported text</h2>
              <span className="text-sm text-gray-500">{charCount.toLocaleString()} / {MAX_RESEARCH_CHARS.toLocaleString()} chars</span>
            </div>
            <div className="p-4 space-y-4">
              {importQuality === "metadata_only" && qualityMessage && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900"><strong>Cannot summarize yet.</strong> {qualityMessage}</p>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap">
                {inputText.slice(0, 2000)}{inputText.length > 2000 && "..."}
              </div>

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >{showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Customize for your capstone project</button>

              {showAdvanced && (
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">My capstone project</label>
                    <input type="text" value={projectContext} onChange={(e) => setProjectContext(e.target.value)}
                      placeholder="e.g. Arduino water quality sensor for Nile Delta canals"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={simpleLanguage} onChange={(e) => setSimpleLanguage(e.target.checked)}
                      className="rounded border-gray-300 text-[#ec4899]"
                    /> Use simple language (recommended)
                  </label>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCurrentStep(1)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-2"
                ><ArrowLeft className="w-4 h-4" /> Back</button>
                <button type="button" onClick={handleSummarize} disabled={loading || !canSummarize}
                  className="px-6 py-2.5 bg-[#ec4899] text-white font-semibold rounded-lg disabled:opacity-40 flex items-center gap-2"
                ><Sparkles className="w-4 h-4" /> {loading ? "Analyzing..." : "Generate Summary"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && currentStep !== 3 && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3] flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#fbcfe8] border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Reading your paper...</p>
                  <p className="text-xs text-gray-400">This usually takes 15-30 seconds</p>
                </div>
              </div>
              <ResearchSummarySkeleton />
            </div>
          </div>
        )}

        {/* === STEP 3: Results === */}
        {currentStep === 3 && summary && !loading && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-[#fdf2f8] to-[#fce7f3]">
              <h2 className="text-base font-bold text-gray-800">Research Summary</h2>
            </div>

            <div className="p-4 space-y-4">

              {inputTruncated && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Only the first part of your text was analyzed to fit AI limits. For best results, paste just the <strong>abstract</strong>.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <CopyButton text={buildPortfolioText(summary, inputText)} label="Copy all for portfolio" />
                <button type="button" onClick={handleSave}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[#ec4899] rounded-lg"
                ><BookmarkPlus className="w-4 h-4" /> Save to library</button>
              </div>
              {saveMessage && <p className="text-sm text-green-600 font-medium">{saveMessage}</p>}

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: "overview", label: "Overview", icon: "📖" },
                  { id: "objective", label: "Objective", icon: "🎯" },
                  { id: "methodology", label: "Methodology", icon: "🔬" },
                  { id: "findings", label: "Key Findings", icon: "📊" },
                ].map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-sm font-semibold transition ${
                      activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >{tab.icon} {tab.label}</button>
                ))}
              </div>

              <div className="text-base text-gray-700 leading-relaxed">
                {activeTab === "overview" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900">What this paper is about</h3>
                      <CopyButton text={summary.overview || summary.abstractText || ""} />
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{summary.overview || summary.abstractText}</p>
                  </div>
                )}
                {activeTab === "objective" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900">Research Objective</h3><CopyButton text={summary.objective} /></div>
                    <p className="leading-relaxed whitespace-pre-wrap">{summary.objective}</p>
                  </div>
                )}
                {activeTab === "methodology" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900">Methodology</h3><CopyButton text={summary.methodology} /></div>
                    <p className="leading-relaxed whitespace-pre-wrap">{summary.methodology}</p>
                  </div>
                )}
                {activeTab === "findings" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start"><h3 className="font-bold text-gray-900">Key Findings</h3><CopyButton text={summary.findings} /></div>
                    <p className="leading-relaxed whitespace-pre-wrap">{summary.findings}</p>
                  </div>
                )}
              </div>

              {summary.capstoneJustification && (
                <div className="bg-gradient-to-r from-[#fdf2f8] to-[#fce7f3] border border-[#fbcfe8] rounded-lg p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#db2777] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Jury Portfolio Justification
                    </h3>
                    <CopyButton text={summary.capstoneJustification} />
                  </div>
                  <p className="leading-relaxed italic">&ldquo;{summary.capstoneJustification}&rdquo;</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-2"
                ><ArrowLeft className="w-4 h-4" /> Back to review</button>
                <button type="button" onClick={() => setShowNewAnalysisConfirm(true)}
                  className="px-6 py-2.5 bg-[#ec4899] text-white font-semibold rounded-lg hover:bg-[#db2777] flex items-center gap-2"
                >New Analysis <Sparkles className="w-4 h-4" /></button>
                <ConfirmDialog
                  open={showNewAnalysisConfirm}
                  title="Start a new analysis?"
                  message="This will clear your current results. You can save this analysis to your library first."
                  confirmLabel="Start new"
                  onConfirm={() => { setShowNewAnalysisConfirm(false); setSummary(null); setInputText(""); setCurrentStep(1); setActiveTab("overview"); }}
                  onCancel={() => setShowNewAnalysisConfirm(false)}
                />
              </div>
            </div>
          </div>
        )}

        <FindPapersGuide />

        {savedPapers.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#ec4899]" /> Saved papers ({savedPapers.length})
            </h3>
            <ul className="space-y-2">
              {savedPapers.slice(0, 5).map((paper) => (
                <li key={paper.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2.5">
                  <Link href={`/research/${paper.id}`} className="flex-1 truncate text-[#ec4899] hover:text-[#db2777] font-medium">{paper.title}</Link>
                  <button type="button" onClick={() => setDeleteConfirmId(paper.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ConfirmDialog
          open={deleteConfirmId !== null}
          title="Delete saved paper?"
          message="This will permanently remove this paper from your library."
          confirmLabel="Delete"
          onConfirm={() => { if (deleteConfirmId) { deleteResearchPaper(deleteConfirmId); setSavedPapers(getAllResearchPapers()); } setDeleteConfirmId(null); }}
          onCancel={() => setDeleteConfirmId(null)}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 leading-relaxed"><strong>Why this matters:</strong> Your Capstone Portfolio must justify every design decision with peer-reviewed research. This tool helps you understand papers and write those justifications.</p>
        </div>
      </div>
    </div>
  );
}
