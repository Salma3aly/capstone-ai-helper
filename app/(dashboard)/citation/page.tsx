"use client";
import { useState, useMemo, useEffect } from "react";
import { Copy, Check, ExternalLink, Plus, X, Sparkles, Loader2, Download, FileText, Quote } from "lucide-react";
import { formatAllCitations } from "@/lib/citation/styles";
import type { CitationStyle, Source } from "@/lib/citation/types";

const STYLES: { id: CitationStyle; label: string; desc: string }[] = [
  { id: "APA", label: "APA 7th", desc: "American Psychological Association" },
  { id: "MLA", label: "MLA 9th", desc: "Modern Language Association" },
  { id: "IEEE", label: "IEEE", desc: "Institute of Electrical and Electronics Engineers" },
  { id: "AMA", label: "AMA 11th", desc: "American Medical Association" },
];

const STORAGE_KEY = "capstone-citation-form";

function loadDraft(): Partial<{
  url: string; title: string; siteName: string; authors: string[];
  pubDate: string; volume: string; issue: string; pages: string; doi: string;
  showCitations: boolean;
}> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveDraft(values: Record<string, any>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* noop */ }
}

export default function CitationPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [siteName, setSiteName] = useState("");
  const [authors, setAuthors] = useState<string[]>([""]);
  const [pubDate, setPubDate] = useState("");
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");
  const [pages, setPages] = useState("");
  const [doi, setDoi] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<CitationStyle | null>(null);
  const [showCitations, setShowCitations] = useState(false);

  // Scraping states
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(true);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Restore from localStorage on client-side mount only (avoids SSR/hydration mismatch)
  useEffect(() => {
    const draft = loadDraft();
    if (draft.url !== undefined) setUrl(draft.url || "");
    if (draft.title !== undefined) setTitle(draft.title || "");
    if (draft.siteName !== undefined) setSiteName(draft.siteName || "");
    if (draft.authors?.length) setAuthors(draft.authors);
    if (draft.pubDate !== undefined) setPubDate(draft.pubDate || "");
    if (draft.volume !== undefined) setVolume(draft.volume || "");
    if (draft.issue !== undefined) setIssue(draft.issue || "");
    if (draft.pages !== undefined) setPages(draft.pages || "");
    if (draft.doi !== undefined) setDoi(draft.doi || "");
    if (draft.showCitations) setShowCitations(true);
    setLoaded(true);
  }, []);

  const source: Source = useMemo(
    () => ({
      url,
      title,
      siteName,
      authors: authors.filter((a) => a.trim()),
      pubDate: pubDate || undefined,
      volume: volume || undefined,
      number: issue || undefined,
      pages: pages || undefined,
      doi: doi || undefined,
    }),
    [url, title, siteName, authors, pubDate, volume, issue, pages, doi]
  );

  const citations = useMemo(() => formatAllCitations(source), [source]);

  // Persist form state + citation visibility to localStorage on every change
  useEffect(() => {
    if (!loaded) return;
    saveDraft({ url, title, siteName, authors, pubDate, volume, issue, pages, doi, showCitations });
  }, [url, title, siteName, authors, pubDate, volume, issue, pages, doi, showCitations, loaded]);

  const updateAuthor = (i: number, val: string) => {
    const next = [...authors];
    next[i] = val;
    setAuthors(next);
  };

  const addAuthor = () => setAuthors([...authors, ""]);
  const removeAuthor = (i: number) => {
    if (authors.length > 1) setAuthors(authors.filter((_, j) => j !== i));
  };

  const copy = async (style: CitationStyle) => {
    await navigator.clipboard.writeText(citations[style]);
    setCopied(style);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = async () => {
    const text = STYLES.map((s) => `${s.label}:\n${citations[s.id]}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied("APA");
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadBib = () => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 30) || "citation";
    const bibEntry = `@article{${safeTitle},
  author = {${source.authors.length > 0 ? source.authors.join(" and ") : "Anonymous"}},
  title = {${title}},
  journal = {${siteName}},
  year = {${pubDate ? pubDate.split("-")[0] : "n.d."}},
  volume = {${volume}},
  number = {${issue}},
  pages = {${pages}},
  doi = {${doi}},
  url = {${url}}
}`;
    const blob = new Blob([bibEntry], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${safeTitle}.bib`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const copyFormatted = async (style: CitationStyle) => {
    const text = `${citations[style]}`;
    await navigator.clipboard.writeText(text);
    setCopied(style);
    setTimeout(() => setCopied(null), 2000);
  };

  const autoFillMetadata = async () => {
    if (!url || !url.trim()) return;
    // Capture any title the user already typed, before clearing
    const typedTitle = title;
    // Clear all fields before populating new data — prevents stale state pollution
    setTitle("");
    setSiteName("");
    setAuthors([""]);
    setPubDate("");
    setVolume("");
    setIssue("");
    setPages("");
    setDoi("");
    setScraping(true);
    setScrapeMsg("Connecting to site and fetching metadata...");
    setIsSuccess(true);
    setShowCitations(false);
    try {
      const res = await fetch("/api/citation/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), title: typedTitle || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Autofill failed");

      setTitle(data.title || "");
      setSiteName(data.siteName || "");
      if (data.authors && data.authors.length > 0) {
        setAuthors(data.authors);
      }
      setPubDate(data.pubDate || "");
      setVolume(data.volume || "");
      setIssue(data.issue || "");
      setPages(data.pages || "");
      setDoi(data.doi || "");

      setScrapeMsg("Successfully scraped page details!");
      setTimeout(() => setScrapeMsg(""), 4000);
    } catch (err: any) {
      setIsSuccess(false);
      setScrapeMsg(err.message || "Autofill failed. Please fill in details manually.");
      setTimeout(() => setScrapeMsg(""), 4000);
    } finally {
      setScraping(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    // Clear all fields before populating new data — prevents stale state pollution
    setTitle("");
    setSiteName("");
    setAuthors([""]);
    setPubDate("");
    setVolume("");
    setIssue("");
    setPages("");
    setDoi("");
    setPdfUploading(true);
    setPdfMsg("Extracting citation data from PDF...");
    setUploadedFileName("");
    setShowCitations(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/citation/extract-pdf", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "PDF processing failed");
      }
      const data = await res.json();
      setTitle(data.title || "");
      setSiteName(data.siteName || "");
      if (data.authors && data.authors.length > 0) {
        setAuthors(data.authors);
      }
      setPubDate(data.pubDate || "");
      setVolume(data.volume || "");
      setIssue(data.issue || "");
      setPages(data.pages || "");
      setDoi(data.doi || "");
      setPdfMsg("PDF processed — fields populated from extracted data");
      setUploadedFileName(file.name);
    } catch (err: any) {
      setPdfMsg(err.message || "Failed to process PDF");
      setUploadedFileName("");
    } finally {
      setPdfUploading(false);
    }
  };

  const handleCite = () => {
    if (!title && !url) return;
    setShowCitations(true);
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Source Details</h2>
              <span className="text-[10px] text-[#ec4899] bg-[#fdf2f8] px-2 py-0.5 rounded-lg font-medium">Automatic scraper active</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">URL *</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={autoFillMetadata}
                  disabled={scraping || !url.trim()}
                  className="bg-[#ec4899] hover:bg-[#db2777] text-white font-semibold px-4 py-2 rounded-lg text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  {scraping ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {scraping ? "Fetching..." : "Autofill"}
                </button>
              </div>
              {scrapeMsg && (
                <p className={`text-[10px] font-medium mt-1.5 ${isSuccess ? "text-green-600" : "text-amber-600"}`}>
                  {scrapeMsg}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-200" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">or upload a PDF</span>
              <hr className="flex-1 border-gray-200" />
            </div>

            {/* PDF Upload */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500">Upload Research Paper (PDF)</label>
                {uploadedFileName && (
                  <button
                    onClick={() => { setUploadedFileName(""); setPdfMsg(""); }}
                    className="text-gray-400 hover:text-[#db2777] transition-colors"
                    title="Remove uploaded file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-1">
                <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors ${pdfUploading ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-white hover:bg-gray-50 hover:border-[#ec4899]"} ${uploadedFileName ? "border-green-300 bg-green-50" : ""}`}>
                  <div className="flex flex-col items-center justify-center py-5 px-4">
                    {pdfUploading ? (
                      <Loader2 className="w-6 h-6 text-[#ec4899] animate-spin mb-2" />
                    ) : uploadedFileName ? (
                      <FileText className="w-6 h-6 text-green-500 mb-2" />
                    ) : (
                      <FileText className="w-6 h-6 text-gray-400 mb-2" />
                    )}
                    <p className={`text-xs font-medium ${uploadedFileName ? "text-green-700" : "text-gray-500"}`}>
                      {pdfUploading ? "Processing PDF..." : uploadedFileName || "Click to upload or drag & drop"}
                    </p>
                    {!uploadedFileName && <p className="text-[10px] text-gray-400 mt-0.5">PDF files only</p>}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    disabled={pdfUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {pdfMsg && (
                <p className={`text-[10px] font-medium mt-1.5 ${pdfMsg.includes("populated") || pdfMsg.includes("processed") ? "text-green-600" : "text-amber-600"}`}>
                  {pdfMsg}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Page Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title of the article or page"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Website / Site Name *</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. IEEE Spectrum, Science Daily"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Authors</label>
              {authors.map((author, i) => (
                <div key={i} className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => updateAuthor(i, e.target.value)}
                    placeholder="e.g. John A. Smith"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                  />
                  {authors.length > 1 && (
                    <button onClick={() => removeAuthor(i)} className="text-gray-400 hover:text-[#db2777] px-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addAuthor}
                className="flex items-center gap-1 text-xs text-[#ec4899] hover:text-[#db2777] mt-1"
              >
                <Plus className="w-3 h-3" /> Add author
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">Publication Date</label>
              <input
                type="text"
                value={pubDate}
                onChange={(e) => setPubDate(e.target.value)}
                placeholder="e.g. 2025"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Volume</label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Issue/Number</label>
                <input
                  type="text"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Pages</label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="e.g. 1-10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500">DOI</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="e.g. 10.1016/j.cossms.2025.101218"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleCite}
              disabled={!title && !url}
              className="w-full bg-[#ec4899] hover:bg-[#db2777] disabled:bg-gray-300 text-white font-bold py-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <Quote className="w-4 h-4" /> Cite
            </button>
          </div>

          {/* Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Generated Citations</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={downloadBib}
              disabled={!title && !url}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-3 h-3" /> .bib
                </button>
                <button
                  onClick={copyAll}
                  disabled={!showCitations}
                  className="flex items-center gap-1 text-xs bg-[#ec4899] text-white px-3 py-1.5 rounded-lg hover:bg-[#db2777] disabled:bg-gray-300 transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied all" : "Copy all"}
                </button>
              </div>
            </div>

            {!showCitations ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center h-full min-h-[300px] flex flex-col justify-center items-center">
                <span className="text-2xl mb-2">📚</span>
                <p className="text-sm text-gray-400">Fill in the source details and click <strong>Cite</strong></p>
                <p className="text-[10px] text-gray-400 mt-1">You can Autofill from a URL or upload a PDF</p>
              </div>
            ) : (
              <div className="space-y-3">
                {STYLES.map((style) => (
                  <div key={style.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow">
                    <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2">
                      <div>
                        <span className="text-sm font-bold text-gray-700">{style.label}</span>
                        <span className="text-xs text-gray-400 ml-2">{style.desc}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => copy(style.id)}
                          className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm leading-relaxed text-gray-800">
                        {citations[style.id]}
                      </p>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#ec4899] hover:text-[#db2777] mt-2"
                        >
                          <ExternalLink className="w-3 h-3" /> Open source
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
