"use client";
import { useState } from "react";
import { ArrowLeft, RefreshCw, Sparkles, Cpu, Download, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { WiringTable } from "./WiringTable";
import { CodePanel } from "./CodePanel";
import { BreadboardSimulator } from "./BreadboardSimulator";
import type { WiringItem, ValidationIssue } from "@/lib/sandbox/types";

interface Props {
  idea: string;
  board: string;
  sensors: string[];
  wiring: WiringItem[];
  code: string;
  language: string;
  onEditComponents: () => void;
  onNewIdea: () => void;
  onSave?: () => void;
  saved?: boolean;
  validation?: ValidationIssue[];
  calibrationNotes?: { name: string; note: string }[];
}

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLORS = {
  error: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

export function OutputStep({
  idea,
  board,
  sensors,
  wiring,
  code,
  language,
  onEditComponents,
  onNewIdea,
  onSave,
  saved,
  validation,
  calibrationNotes,
}: Props) {
  const [hoveredConnection, setHoveredConnection] = useState<{
    component: string;
    connectionIndex: number;
  } | null>(null);

  const downloadIno = () => {
    const ext = language.includes("Python") ? "py" : "ino";
    const filename = `capstone_${board.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs bg-[#fce7f3] text-[#db2777] px-2 py-1 rounded-lg font-medium">{board}</span>
        {sensors.map((id) => (
          <span key={id} className="text-xs bg-gray-100 text-gray-650 px-2 py-1 rounded-lg">{id}</span>
        ))}
        <span className="text-xs text-gray-400 ml-1 truncate max-w-[200px]">— {idea}</span>
      </div>

      {/* Validation issues */}
      {validation && validation.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Build Validation
          </h3>
          {validation.map((issue, i) => {
            const Icon = SEVERITY_ICONS[issue.severity];
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 border rounded-lg p-3 text-xs ${SEVERITY_COLORS[issue.severity]}`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{issue.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Calibration notes */}
      {calibrationNotes && calibrationNotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-500" />
            Calibration Notes
          </h3>
          <div className="space-y-1.5">
            {calibrationNotes.map((c, i) => (
              <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <span className="font-semibold">{c.name}:</span> {c.note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1: Interactive SVG Breadboard Simulator */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-4">
        <BreadboardSimulator
          boardName={board}
          sensors={sensors}
          wiring={wiring}
          hoveredConnection={hoveredConnection}
          onHoverConnection={setHoveredConnection}
        />
      </div>

      {/* Row 2: Side-by-side Panels (Wiring Details & Code) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-700">Wiring Table Connections</span>
          </div>
          <div className="p-4">
            <WiringTable
              wiring={wiring}
              hoveredConnection={hoveredConnection}
              onHoverConnection={setHoveredConnection}
            />
          </div>
        </div>

        <div>
          <CodePanel code={code} language={language} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onEditComponents}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Edit components
        </button>
        <button
          onClick={onNewIdea}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          New idea
        </button>
        <button
          onClick={downloadIno}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download {language.includes("Python") ? ".py" : ".ino"}
        </button>
        {onSave && (
          <button
            onClick={onSave}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-[#ec4899] text-white hover:bg-[#db2777] transition-all shadow-sm ml-auto"
          >
            <span>{saved ? '✓ Saved' : 'Save Project'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
