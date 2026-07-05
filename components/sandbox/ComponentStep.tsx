"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowRight, Search, X, Sparkles, ChevronDown } from "lucide-react";
import { BOARD_COMPONENTS, COMPONENTS } from "@/lib/sandbox/components";
import { ComponentCard } from "./ComponentCard";
import type { ComponentCategory } from "@/lib/sandbox/types";

interface RamItem {
  name: string;
  category: string;
}

interface Props {
  idea: string;
  recommendedBoard: string;
  recommendedSensors: string[];
  why: string;
  selectedBoard: string | null;
  selectedSensors: string[];
  onToggleBoard: (id: string) => void;
  onToggleSensor: (id: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  loading: boolean;
  sensorNames: Record<string, string>;
  onSetSensorName: (id: string, name: string) => void;
}

export function ComponentStep({
  idea,
  recommendedBoard,
  recommendedSensors,
  why,
  selectedBoard,
  selectedSensors,
  onToggleBoard,
  onToggleSensor,
  onGenerate,
  onBack,
  loading,
  sensorNames,
  onSetSensorName,
}: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [allItems, setAllItems] = useState<RamItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ram-components').then(r => r.json()).then((data: RamItem[]) => {
      setAllItems(data);
    }).catch(() => {}).finally(() => setLoadingItems(false));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cats = useMemo(() => {
    return [...new Set(allItems.map((p) => p.category))].sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (query) { const q = query.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q)); }
    if (cat) list = list.filter((p) => p.category === cat);
    return list.slice(0, 200);
  }, [query, cat, allItems]);

  const findCatalogComp = (id: string) => COMPONENTS.find((c) => c.id === id);

  const toggle = (p: RamItem) => {
    const id = `ram-${simpleSlug(p.name)}`;
    onSetSensorName(id, p.name);
    onToggleSensor(id);
  };

  const isSelected = (id: string) => selectedSensors.includes(id);
  const selectedCount = selectedSensors.length;
  const allSelected = selectedBoard && selectedCount > 0;

  const sensorDisplayName = (id: string) => {
    return sensorNames[id] || findCatalogComp(id)?.name || id.replace(/^ram-/, '').replace(/-/g, ' ');
  };

  return (
    <div className="space-y-5">
      {/* Idea preview */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Your idea:</span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg truncate max-w-[300px]">{idea}</span>
        <button onClick={onBack} className="text-xs text-[#ec4899] hover:underline ml-auto">Edit idea</button>
      </div>

      {/* Recommendation banner */}
      {why && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800">{why}</p>
        </div>
      )}

      {/* Board selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Choose your board</h3>
        <div className="flex flex-wrap gap-2">
          {BOARD_COMPONENTS.map((comp) => (
            <ComponentCard
              key={comp.id}
              component={comp}
              selected={selectedBoard === comp.id}
              recommended={comp.id === recommendedBoard}
              onToggle={onToggleBoard}
            />
          ))}
        </div>
      </div>

      {/* Sensor dropdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Add sensors &amp; modules
          {selectedCount > 0 && <span className="text-xs font-normal text-gray-400 ml-2">({selectedCount} selected)</span>}
        </h3>

        {loadingItems ? (
          <p className="text-xs text-gray-400 py-4">Loading components...</p>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-[#fbcfe8] transition focus:outline-none focus:ring-2 focus:ring-[#ec4899]"
            >
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-gray-500">Search and select components...</span>
              <span className="text-xs text-gray-400">{allItems.length} available</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search components..."
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-black placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-gray-700"
                  >
                    <option value="">All categories</option>
                    {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No components found</p>
                  ) : (
                    filtered.map((p, i) => {
                      const id = `ram-${simpleSlug(p.name)}`;
                      const sel = isSelected(id);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggle(p)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition text-left border-b border-gray-50 last:border-0 ${
                            sel ? 'bg-[#fdf2f8] text-[#db2777] font-medium' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${sel ? 'bg-[#ec4899]' : 'bg-gray-300'}`} />
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{p.category}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected chips — show catalog names for catalog sensors, ram-* names for ram ones */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedSensors.map((id) => {
            const name = sensorDisplayName(id);
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-[#fdf2f8] text-[#db2777] text-xs px-2 py-1 rounded-lg border border-[#fbcfe8] max-w-[220px]">
                <span className="truncate">{name}</span>
                <button onClick={() => onToggleSensor(id)} className="shrink-0 hover:text-[#db2777]"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}

      {/* Generate button */}
      <div className="flex gap-3">
        <button
          onClick={onGenerate}
          disabled={!allSelected || loading}
          className="flex items-center gap-2 bg-[#ec4899] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {loading ? "Generating..." : "Generate wiring & code"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function simpleSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
