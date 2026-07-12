"use client";
import { useState, useMemo } from "react";
import type { WiringItem } from "@/lib/sandbox/types";

interface Props {
  boardName: string;
  sensors: string[];
  wiring: WiringItem[];
  hoveredConnection: { component: string; connectionIndex: number } | null;
  onHoverConnection: (hc: { component: string; connectionIndex: number } | null) => void;
}

interface Point { x: number; y: number }

// Breadboard grid constants
const BB = { x: 100, y: 60, w: 440, h: 180, cols: 40, rows: 10, pitch: 10 };
// Arduino Uno
const AR = { x: 130, y: 310, w: 380, h: 200 };
// Arduino digital pins (top edge, 16 pins: AREF,GND,13..2,TX,RX)
const DIG_PINS = ["AREF", "GND", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "TX", "RX"];
// Power pins (bottom-left)
const PWR_PINS = ["RESET", "3.3V", "5V", "GND", "GND", "Vin"];
// Analog pins (bottom-right)
const ANA_PINS = ["A0", "A1", "A2", "A3", "A4", "A5"];

/** Breadboard hole centre for (col, row) — col 0..39, row 0..9 */
function bh(col: number, row: number): Point {
  return { x: BB.x + 10 + col * BB.pitch, y: BB.y + 20 + row * BB.pitch };
}

/** Arduino pin position */
function arPin(category: "dig" | "pwr" | "ana", idx: number): Point {
  if (category === "dig") return { x: AR.x + 60 + idx * 16, y: AR.y + 18 };
  if (category === "pwr") return { x: AR.x + 60 + idx * 16, y: AR.y + AR.h - 18 };
  return { x: AR.x + 240 + idx * 16, y: AR.y + AR.h - 18 };
}

/** Sensor-to-breadboard-hole map — each sensor gets placed on specific grid cells */
function sensorGrid(sName: string, index: number): { col: number; row: number; pins: { label: string; col: number; row: number }[] } {
  const baseCol = 2 + (index % 3) * 13;
  const baseRow = 1 + Math.floor(index / 3) * 3;
  const lower = sName.toLowerCase();

  if (lower.includes("dht")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "VCC", col: baseCol, row: baseRow + 2 },
        { label: "Data", col: baseCol + 1, row: baseRow + 2 },
        { label: "NC", col: baseCol + 2, row: baseRow + 2 },
        { label: "GND", col: baseCol + 3, row: baseRow + 2 },
      ],
    };
  }
  if (lower.includes("ultrasonic") || lower.includes("hc-sr04")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "VCC", col: baseCol, row: baseRow + 2 },
        { label: "Trig", col: baseCol + 1, row: baseRow + 2 },
        { label: "Echo", col: baseCol + 2, row: baseRow + 2 },
        { label: "GND", col: baseCol + 3, row: baseRow + 2 },
      ],
    };
  }
  if (lower.includes("led") && !lower.includes("strip") && !lower.includes("rgb")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "Anode(+)", col: baseCol, row: baseRow + 2 },
        { label: "Cathode(-)", col: baseCol + 2, row: baseRow + 2 },
      ],
    };
  }
  if (lower.includes("soil")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "VCC", col: baseCol, row: baseRow + 2 },
        { label: "GND", col: baseCol + 1, row: baseRow + 2 },
        { label: "AO", col: baseCol + 2, row: baseRow + 2 },
        { label: "DO", col: baseCol + 3, row: baseRow + 2 },
      ],
    };
  }
  if (lower.includes("relay")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "VCC", col: baseCol, row: baseRow + 2 },
        { label: "GND", col: baseCol + 1, row: baseRow + 2 },
        { label: "IN", col: baseCol + 2, row: baseRow + 2 },
      ],
    };
  }
  if (lower.includes("buzzer")) {
    return {
      col: baseCol, row: baseRow,
      pins: [
        { label: "VCC(+)", col: baseCol, row: baseRow + 2 },
        { label: "GND(-)", col: baseCol + 2, row: baseRow + 2 },
      ],
    };
  }
  // fallback: 3-pin
  return {
    col: baseCol, row: baseRow,
    pins: [
      { label: "VCC", col: baseCol, row: baseRow + 2 },
      { label: "GND", col: baseCol + 1, row: baseRow + 2 },
      { label: "Sig", col: baseCol + 2, row: baseRow + 2 },
    ],
  };
}

/** Parse a pin label to figure out which Arduino pin category+index it maps to */
function resolveArduinoPin(label: string): Point | null {
  let clean = label.replace(/pin\s*/i, "").trim().toUpperCase();
  if (clean === "AO") clean = "A0";

  // Check digital
  const digIdx = DIG_PINS.findIndex((p) => p.toUpperCase() === clean);
  if (digIdx !== -1) return arPin("dig", digIdx);
  // Check by value match
  if (clean === "AREF") return arPin("dig", 0);
  if (clean === "GND") return arPin("dig", 1); // top GND
  if (/^\d+$/.test(clean)) {
    const n = parseInt(clean, 10);
    if (n >= 2 && n <= 13) {
      const idx = DIG_PINS.indexOf(String(n));
      if (idx !== -1) return arPin("dig", idx);
    }
  }
  if (clean === "TX" || clean === "RX") {
    const idx = DIG_PINS.findIndex((p) => p.toUpperCase() === clean);
    if (idx !== -1) return arPin("dig", idx);
  }
  // Power
  const pwrIdx = PWR_PINS.findIndex((p) => p.toUpperCase() === clean || p.toUpperCase().startsWith(clean));
  if (pwrIdx !== -1) return arPin("pwr", pwrIdx);
  // Analog
  const anaIdx = ANA_PINS.findIndex((p) => p.toUpperCase() === clean);
  if (anaIdx !== -1) return arPin("ana", anaIdx);
  return null;
}

export function BreadboardSimulator({
  boardName,
  sensors,
  wiring,
  hoveredConnection,
  onHoverConnection,
}: Props) {
  // Sensor grid placements
  const sensorGrids = useMemo(() => sensors.map((s, i) => ({ name: s, grid: sensorGrid(s, i) })), [sensors]);

  // Wires from breadboard holes → Arduino pins
  const parsedWires = useMemo(() => {
    const list: {
      id: string; component: string; connIndex: number; label: string;
      from: Point; to: Point; color: string;
    }[] = [];

    const cleanComp = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/sensor|module|shield|board/g, "");

    wiring.forEach((item) => {
      const targetClean = cleanComp(item.component);
      const sGrid = sensorGrids.find((sg) => {
        const sgClean = cleanComp(sg.name);
        return sgClean.includes(targetClean) || targetClean.includes(sgClean);
      });
      if (!sGrid) return;

      item.connections.forEach((connStr, cIdx) => {
        const parts = connStr.split("→").map((s) => s.trim());
        const srcLabel = parts[0];
        const dstLabel = parts[1] || "";

        // Find source pin (breadboard hole)
        const normalizePin = (s: string) => s.toLowerCase().replace(/0/g, "o").trim();
        const normSrc = normalizePin(srcLabel);
        const sPin = sGrid.grid.pins.find((p) => {
          const normP = normalizePin(p.label);
          return normP.includes(normSrc) || normSrc.includes(normP);
        });
        const fromPt = sPin ? bh(sPin.col, sPin.row) : bh(sGrid.grid.col + 1, sGrid.grid.row + 2);

        // Find destination (Arduino pin)
        let toPt = resolveArduinoPin(dstLabel);
        // try alternative: extract number from "Pin 9" etc
        if (!toPt) {
          const num = dstLabel.replace(/\D/g, "");
          if (num) toPt = resolveArduinoPin(num);
        }
        if (!toPt) toPt = arPin("dig", 5); // fallback

        // Colour
        const sLower = srcLabel.toLowerCase();
        let color = "#f59e0b";
        if (sLower.includes("vcc") || sLower.includes("5v") || sLower.includes("3.3v")) color = "#ec4899";
        else if (sLower.includes("gnd")) color = "#64748b";
        else if (sLower.includes("sda") || sLower.includes("scl") || sLower.includes("tx") || sLower.includes("rx") || sLower.includes("echo")) color = "#a855f7";

        list.push({
          id: `${item.component}-${cIdx}`,
          component: item.component,
          connIndex: cIdx,
          label: connStr,
          from: fromPt,
          to: toPt,
          color,
        });
      });
    });
    return list;
  }, [wiring, sensorGrids]);

  const [zoom, setZoom] = useState(1);
  const ZOOM_STEP = 0.25;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.5;
  const viewW = 800;
  const viewH = 580;

  return (
    <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-4 overflow-hidden select-none">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wide">Breadboard Wiring Diagram</h4>
        <span className="text-[10px] text-[#94a3b8] bg-white border border-[#e2e8f0] px-2 py-0.5 rounded-lg">{Math.round(zoom * 100)}% — Hover wires to inspect</span>
      </div>
      <div className="relative bg-white rounded-lg border border-[#e2e8f0] overflow-hidden shadow-inner">
        <div className="origin-top-left" style={{ transform: `scale(${zoom})`, width: viewW, height: viewH }}>
        <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-full" style={{ minHeight: 400 }}>
          <defs>
            <pattern id="bg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={viewW} height={viewH} fill="url(#bg-grid)" />

          {/* ═══════════════ BREADBOARD ═══════════════ */}
          <g>
            <rect x={BB.x} y={BB.y} width={BB.w} height={BB.h} rx="8" fill="#fafafa" stroke="#e2e8f0" strokeWidth="2" />
            {/* Power rails */}
            <line x1={BB.x + 10} y1={BB.y + 10} x2={BB.x + BB.w - 10} y2={BB.y + 10} stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 4" />
            <line x1={BB.x + 10} y1={BB.y + 20} x2={BB.x + BB.w - 10} y2={BB.y + 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 4" />
            <line x1={BB.x + 10} y1={BB.y + BB.h - 10} x2={BB.x + BB.w - 10} y2={BB.y + BB.h - 10} stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 4" />
            <line x1={BB.x + 10} y1={BB.y + BB.h - 20} x2={BB.x + BB.w - 10} y2={BB.y + BB.h - 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 4" />
            {/* Holes grid (40x10) */}
            {Array.from({ length: BB.cols }).map((_, c) =>
              Array.from({ length: BB.rows }).map((_, r) => {
                const p = bh(c, r);
                return <circle key={`${c}-${r}`} cx={p.x} cy={p.y} r="1.8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5" />;
              })
            )}
            {/* Column letters */}
            {Array.from({ length: 5 }).map((_, i) => (
              <text key={`t${i}`} x={bh(i, 0).x} y={BB.y + 5} fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">{String.fromCharCode(97 + i)}</text>
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <text key={`b${i}`} x={bh(i, 0).x} y={BB.y + BB.h - 2} fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">{String.fromCharCode(102 + i)}</text>
            ))}
            {/* Row numbers */}
            {Array.from({ length: BB.rows }).map((_, r) => (
              <text key={`r${r}`} x={BB.x + 4} y={bh(0, r).y + 2} fill="#94a3b8" fontSize="5" textAnchor="end" fontFamily="monospace">{r + 1}</text>
            ))}
          </g>

          {/* ═══════════════ ARDUINO UNO ═══════════════ */}
          <g>
            {/* Board */}
            <rect x={AR.x} y={AR.y} width={AR.w} height={AR.h} rx="10" fill="#0f172a" stroke="#1e293b" strokeWidth="3" />
            <rect x={AR.x + 5} y={AR.y + 5} width={AR.w - 10} height={AR.h - 10} rx="8" fill="#1e3a8a" opacity="0.9" />
            {/* USB */}
            <rect x={AR.x - 10} y={AR.y + 30} width="25" height="40" rx="3" fill="#cbd5e1" stroke="#94a3b8" />
            {/* Power jack */}
            <rect x={AR.x - 5} y={AR.y + 120} width="20" height="40" rx="3" fill="#334155" />
            {/* Label */}
            <text x={AR.x + AR.w / 2} y={AR.y + 100} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle" letterSpacing="1" opacity="0.8">
              {boardName.toUpperCase()}
            </text>
            <text x={AR.x + AR.w / 2} y={AR.y + 120} fill="#c4b5fd" fontSize="9" textAnchor="middle" opacity="0.6">
              Project Assistant
            </text>
            {/* ATMEGA328P */}
            <rect x={AR.x + 220} y={AR.y + 55} width="100" height="28" fill="#0f172a" stroke="#1e293b" />
            <line x1={AR.x + 225} y1={AR.y + 55} x2={AR.x + 225} y2={AR.y + 83} stroke="#cbd5e1" strokeWidth="2" />
            <text x={AR.x + 270} y={AR.y + 72} fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">ATMEGA328P</text>

            {/* DIGITAL PINS (top edge, labeled) */}
            <g transform={`translate(${AR.x + 60}, ${AR.y + 8})`}>
              <rect width={256} height="18" fill="#020617" rx="2" />
              {DIG_PINS.map((label, i) => {
                const px = 2 + i * 16;
                return (
                  <g key={`dig-${i}`}>
                    <rect x={px} y="3" width="12" height="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <text x={px + 6} y={27} fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">{label}</text>
                  </g>
                );
              })}
            </g>

            {/* POWER PINS (bottom-left, labeled) */}
            <g transform={`translate(${AR.x + 60}, ${AR.y + AR.h - 26})`}>
              <rect width={96} height="18" fill="#020617" rx="2" />
              {PWR_PINS.map((label, i) => {
                const px = 2 + i * 16;
                return (
                  <g key={`pwr-${i}`}>
                    <rect x={px} y="3" width="12" height="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <text x={px + 6} y={-3} fill="#94a3b8" fontSize="5" textAnchor="middle" fontFamily="monospace">{label}</text>
                  </g>
                );
              })}
            </g>

            {/* ANALOG PINS (bottom-right, labeled) */}
            <g transform={`translate(${AR.x + 240}, ${AR.y + AR.h - 26})`}>
              <rect width={96} height="18" fill="#020617" rx="2" />
              {ANA_PINS.map((label, i) => {
                const px = 2 + i * 16;
                return (
                  <g key={`ana-${i}`}>
                    <rect x={px} y="3" width="12" height="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <text x={px + 6} y={-3} fill="#94a3b8" fontSize="5" textAnchor="middle" fontFamily="monospace">{label}</text>
                  </g>
                );
              })}
            </g>
          </g>

          {/* ═══════════════ COMPONENTS ON BREADBOARD ═══════════════ */}
          {sensorGrids.map((sg, idx) => {
            const { col, row, pins } = sg.grid;
            const labelX = bh(col, row).x + (pins.length * BB.pitch) / 2;
            const labelY = bh(col, row).y - 6;
            return (
              <g key={sg.name}>
                {/* Component highlight region */}
                <rect
                  x={bh(col, row - 1).x - 4}
                  y={bh(col - 1, row - 1).y - 4}
                  width={Math.max(pins.length, 2) * BB.pitch + 8}
                  height={3 * BB.pitch + 8}
                  rx="4"
                  fill="#fdf2f8"
                  stroke="#c4b5fd"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                {/* Component name */}
                <text x={labelX} y={labelY}                   fill="#db2777" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  {sg.name.length > 14 ? sg.name.slice(0, 14) + "…" : sg.name}
                </text>
                {/* Pin labels at each hole */}
                {pins.map((p, pi) => {
                  const h = bh(p.col, p.row);
                  return (
                    <g key={`${sg.name}-pin-${pi}`}>
                      <circle cx={h.x} cy={h.y} r="2.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
                      <text x={h.x} y={h.y - 6} fill="#3b82f6" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ═══════════════ WIRES ═══════════════ */}
          {parsedWires.map((wire) => {
            const isHovered =
              hoveredConnection?.component === wire.component &&
              hoveredConnection?.connectionIndex === wire.connIndex;
            const midX = (wire.from.x + wire.to.x) / 2;
            const pathD = `M ${wire.from.x} ${wire.from.y} C ${midX} ${wire.from.y}, ${midX} ${wire.to.y}, ${wire.to.x} ${wire.to.y}`;
            return (
              <g
                key={wire.id}
                onMouseEnter={() => onHoverConnection({ component: wire.component, connectionIndex: wire.connIndex })}
                onMouseLeave={() => onHoverConnection(null)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
                )}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="15" strokeLinecap="round" />
                <path d={pathD} fill="none" stroke={wire.color} strokeWidth={isHovered ? 3.5 : 2.2} strokeLinecap="round" className="transition-all duration-150" />
                <path d={pathD} fill="none" stroke="#fff" strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
                {isHovered && (
                  <text x={midX} y={(wire.from.y + wire.to.y) / 2 - 8} fill="#1e293b" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    {wire.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        </div>
        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 border border-gray-200 rounded-lg shadow-sm px-1.5 py-1">
          <button onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))} disabled={zoom <= ZOOM_MIN}
            className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-[#ec4899] hover:bg-[#fdf2f8] rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Zoom out"
          >−</button>
          <span className="text-[10px] font-mono text-slate-500 min-w-[2.2em] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))} disabled={zoom >= ZOOM_MAX}
            className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-[#ec4899] hover:bg-[#fdf2f8] rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Zoom in"
          >+</button>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-4 text-[9px] text-[#64748b] justify-center mt-2.5">
        <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#ec4899] inline-block" /> Power (5V/VCC)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#64748b] inline-block" /> Ground (GND)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#a855f7] inline-block" /> Data</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#f59e0b] inline-block" /> Signal</span>
      </div>
    </div>
  );
}
