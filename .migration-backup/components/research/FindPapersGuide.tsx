"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

export function FindPapersGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-amber-100/50 transition"
      >
        <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-sm font-semibold text-amber-900 flex-1">Where to find papers</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-amber-700" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-700" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-amber-900 space-y-3 border-t border-amber-200/60 pt-3">
          <div>
            <strong className="block mb-1">Free sources</strong>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li>
                <a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">Google Scholar</a> — search by topic, look for PDF links
              </li>
              <li>
                <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">arXiv</a> — free preprints in physics, CS, engineering
              </li>
              <li>
                <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">PubMed</a> — biomedical and health sciences
              </li>
            </ul>
          </div>
          <div>
            <strong className="block mb-1">Is this source reliable? (CRAAP checklist)</strong>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li><strong>C</strong>urrency — Is it recent enough for your topic?</li>
              <li><strong>R</strong>elevance — Does it relate to your capstone?</li>
              <li><strong>A</strong>uthority — Peer-reviewed journal or university?</li>
              <li><strong>A</strong>ccuracy — Do other papers cite it?</li>
              <li><strong>P</strong>urpose — Research, not a blog or ad?</li>
            </ul>
          </div>
          <p className="text-amber-800">
            If URL import fails, copy the <strong>abstract</strong> and paste it here, or upload a text/PDF file.
          </p>
        </div>
      )}
    </div>
  );
}
