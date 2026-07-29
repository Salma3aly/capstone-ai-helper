"use client";

import React, { useState } from "react";

export interface ArchitectureNode {
  id: string;
  label: string;
  type: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

interface ArchitectureDiagramProps {
  nodes?: ArchitectureNode[];
  edges?: ArchitectureEdge[];
}

// 7-color palette map object
const COLOR_PALETTE: Record<string, string> = {
  page: "#ec4899",       // Pink: Pages / UI
  service: "#a855f7",    // Purple: Services / Backend Logic
  database: "#8b5cf6",   // Violet: Database / Storage
  external: "#3b82f6",   // Blue: External Integrations
  sensor: "#f59e0b",     // Amber: Input / Sensors
  controller: "#14b8a6", // Teal: Microcontroller / Controller
  actuator: "#ef4444",   // Red: Output / Actuators
};

// Map node types to standard categories and colors
function getNodeTypeAndColor(type: string): { typeKey: string; color: string } {
  const t = type.toLowerCase().trim();

  // 1. Pages / UI (Pink)
  if (["page", "ui", "client", "frontend", "screen", "view"].includes(t)) {
    return { typeKey: "page", color: COLOR_PALETTE.page };
  }

  // 2. Database / Storage (Violet)
  if (["database", "db", "storage", "memory", "mongodb", "mysql", "redis", "postgres"].includes(t)) {
    return { typeKey: "database", color: COLOR_PALETTE.database };
  }

  // 3. External Integrations (Blue)
  if (["external", "integration", "third-party", "api", "gateway", "stripe", "pusher", "auth0"].includes(t)) {
    return { typeKey: "external", color: COLOR_PALETTE.external };
  }

  // 4. Sensors / Inputs (Amber)
  if (["sensor", "input", "source", "temperature", "humidity", "moisture", "light", "ultrasonic", "ir", "motion", "gas", "pressure", "sound", "touch", "flow"].includes(t)) {
    return { typeKey: "sensor", color: COLOR_PALETTE.sensor };
  }

  // 5. Microcontroller / Controller (Teal)
  if (["controller", "microcontroller", "processor", "arduino", "esp32", "raspberrypi", "mcu", "processing"].includes(t)) {
    return { typeKey: "controller", color: COLOR_PALETTE.controller };
  }

  // 6. Actuator / Outputs (Red)
  if (["actuator", "output", "display", "motor", "pump", "valve", "led", "buzzer", "heater", "fan", "relay", "servo", "solenoid", "screen"].includes(t)) {
    return { typeKey: "actuator", color: COLOR_PALETTE.actuator };
  }

  // 7. Services / Backend Logic (Purple) - default fallback
  return { typeKey: "service", color: COLOR_PALETTE.service };
}

// Assign any node category to one of the 3 pipeline stages or database section
function typeToColumn(type: string): "input" | "proc" | "output" | "data" {
  const { typeKey } = getNodeTypeAndColor(type);
  if (typeKey === "database") return "data";
  if (typeKey === "sensor" || typeKey === "external") return "input";
  if (typeKey === "actuator" || typeKey === "page") return "output";
  return "proc";
}

// Render dynamic inline SVG icons based on node type
function renderNodeIcon(typeKey: string) {
  switch (typeKey) {
    case "page":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
          <circle cx="5" cy="6" r="1" fill="currentColor" />
          <circle cx="8" cy="6" r="1" fill="currentColor" />
        </svg>
      );
    case "database":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      );
    case "external":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "sensor":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case "controller":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
        </svg>
      );
    case "actuator":
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v20M2 12h20M12 12l5-5" />
        </svg>
      );
    default: // service
      return (
        <svg className="w-4 h-4 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
  }
}

export default function ArchitectureDiagram({ nodes = [], edges = [] }: ArchitectureDiagramProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Group nodes by columns
  const groups: Record<"input" | "proc" | "output" | "data", ArchitectureNode[]> = {
    input: [],
    proc: [],
    output: [],
    data: [],
  };

  nodes.forEach((n) => {
    const col = typeToColumn(n.type);
    groups[col].push(n);
  });

  // Layout parameters
  const canvasW = 1040;
  const NODE_H = 56;
  const GAP_Y = 120;
  const PAD_Y = 70;
  
  // Responsive Columns Center coordinates: 20%, 50%, 80%
  const c1 = canvasW * 0.20; // 208
  const c2 = canvasW * 0.50; // 520
  const c3 = canvasW * 0.80; // 832
  
  // Find longest label to adjust node width dynamically (collision safety)
  const longestLabel = nodes.reduce((max, n) => Math.max(max, (n.label || n.id).length), 0);
  const pxPerChar = longestLabel > 14 ? 7 : 8.5;
  const NODE_W = Math.min(Math.max(Math.ceil(longestLabel * pxPerChar + 44), 170), 280);
  const DB_W = Math.min(NODE_W + 20, 260);

  // Find max nodes in any column to determine total pipeline height
  const maxN = Math.max(1, groups.input.length, groups.proc.length, groups.output.length);
  const totalH = maxN * NODE_H + (maxN - 1) * GAP_Y;
  const colH = totalH + 60;
  const colBgBottom = 10 + colH;
  const dbTop = colBgBottom + 40;

  // Position nodes with automated vertical stacking to prevent collisions
  const pos: Record<string, { x: number; y: number; w: number; h: number; color: string; typeKey: string }> = {};

  // 1. Position Input column
  const startYInput = PAD_Y + (totalH - (groups.input.length * NODE_H + (groups.input.length - 1) * GAP_Y)) / 2;
  groups.input.forEach((n, i) => {
    const { typeKey, color } = getNodeTypeAndColor(n.type);
    pos[n.id] = {
      x: c1,
      y: startYInput + i * (NODE_H + GAP_Y) + NODE_H / 2,
      w: NODE_W,
      h: NODE_H,
      color,
      typeKey,
    };
  });

  // 2. Position Processing / Controller column (Auto Y-axis stacking)
  const startYProc = PAD_Y + (totalH - (groups.proc.length * NODE_H + (groups.proc.length - 1) * GAP_Y)) / 2;
  groups.proc.forEach((n, i) => {
    const { typeKey, color } = getNodeTypeAndColor(n.type);
    pos[n.id] = {
      x: c2,
      y: startYProc + i * (NODE_H + GAP_Y) + NODE_H / 2,
      w: NODE_W,
      h: NODE_H,
      color,
      typeKey,
    };
  });

  // 3. Position Output / Actuators column
  const startYOutput = PAD_Y + (totalH - (groups.output.length * NODE_H + (groups.output.length - 1) * GAP_Y)) / 2;
  groups.output.forEach((n, i) => {
    const { typeKey, color } = getNodeTypeAndColor(n.type);
    pos[n.id] = {
      x: c3,
      y: startYOutput + i * (NODE_H + GAP_Y) + NODE_H / 2,
      w: NODE_W,
      h: NODE_H,
      color,
      typeKey,
    };
  });

  // 4. Position Database / Storage (centered under col 2, with 174px gaps)
  groups.data.forEach((n, i) => {
    const { typeKey, color } = getNodeTypeAndColor(n.type);
    pos[n.id] = {
      x: c2 + (i - (groups.data.length - 1) / 2) * 174,
      y: dbTop + NODE_H / 2,
      w: DB_W,
      h: NODE_H,
      color,
      typeKey,
    };
  });

  // Handle orphans (nodes in edges but missing in nodes list)
  let orphanCount = 0;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  edges.forEach((e) => {
    if (!pos[e.from]) {
      const n = nodeMap.get(e.from);
      const { typeKey, color } = getNodeTypeAndColor(n?.type || "service");
      pos[e.from] = {
        x: c2,
        y: PAD_Y + orphanCount++ * 80 + NODE_H / 2,
        w: NODE_W,
        h: NODE_H,
        color,
        typeKey,
      };
    }
    if (!pos[e.to]) {
      const n = nodeMap.get(e.to);
      const { typeKey, color } = getNodeTypeAndColor(n?.type || "service");
      pos[e.to] = {
        x: c2,
        y: PAD_Y + orphanCount++ * 80 + NODE_H / 2,
        w: NODE_W,
        h: NODE_H,
        color,
        typeKey,
      };
    }
  });

  // Calculate final canvas height
  const viewH = (groups.data.length > 0 ? dbTop : PAD_Y + totalH) + NODE_H + 80;

  // Gather unique types present for the legend
  const typesPresent = Array.from(new Set(nodes.map((n) => getNodeTypeAndColor(n.type).typeKey))).sort();

  const renderSVG = () => (
    <svg viewBox={`0 0 ${canvasW} ${viewH}`} className="w-full h-auto" style={{ minWidth: "600px" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#94a3b8" />
        </marker>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Column background panels */}
      <g>
        {/* Column 1 background */}
        <rect x={c1 - 150} y={10} width={300} height={colH} fill="#f8fafc" rx="12" stroke="#e2e8f0" strokeWidth="1" />
        <text x={c1} y={32} textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest" fill="#94a3b8">
          Input / External
        </text>

        {/* Column 2 background */}
        <rect x={c2 - 150} y={10} width={300} height={colH} fill="#f8fafc" rx="12" stroke="#e2e8f0" strokeWidth="1" />
        <text x={c2} y={32} textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest" fill="#94a3b8">
          Processing / Logic
        </text>

        {/* Column 3 background */}
        <rect x={c3 - 150} y={10} width={300} height={colH} fill="#f8fafc" rx="12" stroke="#e2e8f0" strokeWidth="1" />
        <text x={c3} y={32} textAnchor="middle" className="text-[10px] font-bold uppercase tracking-widest" fill="#94a3b8">
          Output / Actuators
        </text>
      </g>

      {/* Database section background panel */}
      {groups.data.length > 0 && (
        <g>
          <rect
            x={c2 - ((groups.data.length - 1) * 174 + DB_W + 60) / 2}
            y={dbTop - 20}
            width={(groups.data.length - 1) * 174 + DB_W + 60}
            height={NODE_H + 40}
            fill="#f1f5f9"
            rx="12"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={c2 - ((groups.data.length - 1) * 174 + DB_W + 60) / 2 + 16}
            y={dbTop - 4}
            textAnchor="start"
            className="text-[9px] font-bold uppercase tracking-widest"
            fill="#94a3b8"
          >
            Storage Layer
          </text>
        </g>
      )}

      {/* Edge lines drawing with spread routing for multiple connections */}
      {(() => {
        const srcInfo: Record<string, { total: number; indexOffset: number }> = {};
        const tgtInfo: Record<string, { total: number; indexOffset: number }> = {};
        
        edges.forEach((e) => {
          srcInfo[e.from] = { total: (srcInfo[e.from]?.total || 0) + 1, indexOffset: 0 };
          tgtInfo[e.to] = { total: (tgtInfo[e.to]?.total || 0) + 1, indexOffset: 0 };
        });

        return edges.map((edge, i) => {
          const f = pos[edge.from];
          const t = pos[edge.to];
          if (!f || !t) return null;

          const srcIdx = srcInfo[edge.from].indexOffset++;
          const srcTotal = srcInfo[edge.from].total;
          const tgtIdx = tgtInfo[edge.to].indexOffset++;
          const tgtTotal = tgtInfo[edge.to].total;

          const dx = t.x - f.x;
          const isLtr = Math.abs(dx) > 20 ? dx > 0 : true;
          const isSameCol = Math.abs(dx) <= 20;

          // Spread routing to prevent overlapping lines
          const spread = 12;
          const srcOff = (srcIdx - (srcTotal - 1) / 2) * spread;
          const tgtOff = (tgtIdx - (tgtTotal - 1) / 2) * spread;

          let x1: number, y1: number, x2: number, y2: number;
          if (isSameCol) {
            const srcAbove = f.y < t.y;
            x1 = f.x + srcOff;
            y1 = srcAbove ? f.y + f.h / 2 : f.y - f.h / 2;
            x2 = t.x + tgtOff;
            y2 = srcAbove ? t.y - t.h / 2 : t.y + t.h / 2;
          } else {
            x1 = isLtr ? f.x + f.w / 2 : f.x - f.w / 2;
            y1 = f.y + srcOff;
            x2 = isLtr ? t.x - t.w / 2 : t.x + t.w / 2;
            y2 = t.y + tgtOff;
          }

          const midX = (x1 + x2) / 2;
          const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
          const edgeY = Math.min(y1, y2);
          const labelY = edgeY - 25;
          const labelW = edge.label ? Math.max(edge.label.length * 6 + 12, 30) : 0;

          return (
            <g key={`edge-${edge.from}-${edge.to}-${i}`}>
              <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)" />
              {edge.label && (
                <g>
                  <line x1={midX} y1={edgeY} x2={midX} y2={labelY + 8} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
                  <rect
                    x={midX - labelW / 2}
                    y={labelY - 6}
                    width={labelW}
                    height={15}
                    rx="4"
                    fill="white"
                    stroke="#cbd5e1"
                    strokeWidth="0.5"
                  />
                  <text x={midX} y={labelY + 5} textAnchor="middle" className="text-[9px] font-medium" fill="#64748b">
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        });
      })()}

      {/* Node elements with customized premium icons */}
      {Object.entries(pos).map(([id, p]) => {
        const node = nodeMap.get(id);
        const label = node?.label || id;
        
        return (
          <g key={`node-${id}`} filter="url(#shadow)">
            {/* Background block */}
            <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} rx="10" fill={p.color} />
            
            {/* Glossy top highlight */}
            <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={4} rx="2" fill="white" fillOpacity="0.2" />

            {/* Icon + Label alignment */}
            <g transform={`translate(${p.x - p.w / 2 + 12}, ${p.y - 8})`}>
              {/* Type-based icon */}
              <g transform="translate(0, 0)">
                {renderNodeIcon(p.typeKey)}
              </g>
              {/* Node title */}
              <text
                x={22}
                y={13}
                textAnchor="start"
                className="text-[11px] font-bold fill-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {label.length > 22 ? `${label.slice(0, 20)}...` : label}
              </text>
            </g>

            {/* Subtle type-badge in white semi-transparent */}
            <text
              x={p.x + p.w / 2 - 12}
              y={p.y + p.h / 2 - 8}
              textAnchor="end"
              className="text-[8px] font-medium uppercase fill-white/80 tracking-wide"
            >
              {p.typeKey}
            </text>
          </g>
        );
      })}

      {/* Legend showing types present in the project */}
      {typesPresent.length > 0 && (
        <g transform={`translate(16, ${viewH - 30})`}>
          <rect
            x={0}
            y={0}
            width={typesPresent.length * 90 + 16}
            height={20}
            rx="6"
            fill="white"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {typesPresent.map((t, i) => (
            <g key={`legend-${t}`} transform={`translate(${8 + i * 90}, 5)`}>
              <rect x={0} y={0} width={10} height={10} rx="3" fill={COLOR_PALETTE[t] || "#cbd5e1"} />
              <text x={14} y={8} className="text-[8px] font-bold text-[#64748b] capitalize">
                {t}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );

  return (
    <div className="relative">
      <div className="w-full overflow-x-auto bg-white border border-[#e2e8f0] rounded-xl p-4 min-h-[360px]">
        {renderSVG()}
        
        {/* Fullscreen control button */}
        <button
          onClick={() => setFullscreen(true)}
          className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] hover:text-[#ec4899] transition shadow-sm"
          title="Enlarge Diagram"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Enlarge
        </button>
      </div>

      {/* Fullscreen Overlay Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative w-[95vw] h-[90vh] bg-white rounded-2xl shadow-2xl overflow-auto p-6 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-10 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] hover:text-[#e11d48] transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close
            </button>
            <div className="w-full h-full max-h-[80vh] flex items-center justify-center py-4">
              {renderSVG()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
