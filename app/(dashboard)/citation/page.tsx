"use client";
import { useState, useMemo } from "react";
import { Copy, Check, ExternalLink, Plus, X, Sparkles, Loader2, Download, FileText } from "lucide-react";
import { formatAllCitations } from "@/lib/citation/styles";
import type { CitationStyle, Source } from "@/lib/citation/types";

const STYLES: { id: CitationStyle; label: string; desc: string }[] = [
  { id: "APA", label: "APA 7th", desc: "American Psychological Association" },
  { id: "MLA", label: "MLA 9th", desc: "Modern Language Association" },
  { id: "IEEE", label: "IEEE", desc: "Institute of Electrical and Electronics Engineers" },
  { id: "AMA", label: "AMA 11th", desc: "American Medical Association" },
];

export default function CitationPage() {
  const today = new Date().toISOString().split("T")[0];

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [siteName, setSiteName] = useState("");
  const [authors, setAuthors] = useState<string[]>([""]);
  const [pubDate, setPubDate] = useState("");
  const [accessDate, setAccessDate] = useState(today);
  const [copied, setCopied] = useState<CitationStyle | null>(null);

  // Scraping states
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(true);

  const source: Source = useMemo(
    () => ({
      url,
      title,
      siteName,
      authors: authors.filter((a) => a.trim()),
      pubDate: pubDate || undefined,
      accessDate,
    }),
    [url, title, siteName, authors, pubDate, accessDate]
  );

  const citations = useMemo(() => formatAllCitations(source), [source]);

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
    const bibEntry = `@misc{${safeTitle},
  author = {${source.authors.length > 0 ? source.authors.join(" and ") : "Anonymous"}},
  title = {${title}},
  year = {${pubDate ? pubDate.split("-")[0] : "n.d."}},
  howpublished = {${url}},
  note = {Accessed: ${accessDate}}
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
    const text = `${citations[style]}\n\n— Retrieved from ${url}`;
    await navigator.clipboard.writeText(text);
    setCopied(style);
    setTimeout(() => setCopied(null), 2000);
  };

  const autoFillMetadata = async () => {
    if (!url || !url.trim()) return;
    setScraping(true);
    setScrapeMsg("Connecting to site and fetching metadata...");
    setIsSuccess(true);
    try {
      const res = await fetch("/api/citation/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.title) setTitle(data.title);
      if (data.siteName) setSiteName(data.siteName);
      if (data.authors && data.authors.length > 0) {
        setAuthors(data.authors);
      } else {
        setAuthors([""]);
      }
      if (data.pubDate) setPubDate(data.pubDate);

      setScrapeMsg("Successfully scraped page details!");
      setTimeout(() => setScrapeMsg(""), 4000);
    } catch (err) {
      setIsSuccess(false);
      setScrapeMsg("Autofill failed. Please fill in coordinates manually.");
      setTimeout(() => setScrapeMsg(""), 4000);
    } finally {
      setScraping(false);
    }
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Publication Date</label>
                <input
                  type="date"
                  value={pubDate}
                  onChange={(e) => setPubDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Access Date</label>
                <input
                  type="date"
                  value={accessDate}
                  onChange={(e) => setAccessDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black"
                />
              </div>
            </div>
          </div>

          {/* Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Generated Citations</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={downloadBib}
                  disabled={!url || !title}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-3 h-3" /> .bib
                </button>
                <button
                  onClick={copyAll}
                  disabled={!url || !title}
                  className="flex items-center gap-1 text-xs bg-[#ec4899] text-white px-3 py-1.5 rounded-lg hover:bg-[#db2777] disabled:bg-gray-300 transition-colors shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied all" : "Copy all"}
                </button>
              </div>
            </div>

            {!url || !title ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center h-full min-h-[300px] flex flex-col justify-center items-center">
                <span className="text-2xl mb-2">📚</span>
                <p className="text-sm text-gray-400">Fill in the URL and click Autofill (or type details manually)</p>
                <p className="text-[10px] text-gray-400 mt-1">citations compile automatically in real-time</p>
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
                          onClick={() => copyFormatted(style.id)}
                          className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                          title="Copy with source link for Word/Google Docs"
                        >
                          {copied === style.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          {copied === style.id ? "Copied" : "Copy formatted"}
                        </button>
                        <button
                          onClick={() => copy(style.id)}
                          className="flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Plain
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
