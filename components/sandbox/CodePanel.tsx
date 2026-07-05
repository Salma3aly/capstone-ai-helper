"use client";
import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";
import { Copy, Check } from "lucide-react";

interface Props {
  code: string;
  language?: string;
}

function prismLang(language: string): string {
  const lower = language.toLowerCase();
  if (lower.includes("python") || lower.includes("micropython")) return "python";
  if (lower.includes("c++") || lower.includes("arduino")) return "cpp";
  return "c";
}

export function CodePanel({ code, language = "Arduino C++" }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (preRef.current) {
      Prism.highlightElement(preRef.current);
    }
  }, [code]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) {
    return <p className="text-xs text-slate-500 italic p-4">No code generated yet.</p>;
  }

  return (
    <div className="h-full flex flex-col">
      <pre
        ref={preRef}
        className={`language-${prismLang(language)} text-xs leading-relaxed p-4 overflow-x-auto overflow-y-auto m-0 flex-1`}
        style={{ margin: 0, background: "#1e293b", borderRadius: 0 }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
