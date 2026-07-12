'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { EXAMPLES } from '@/lib/examples/data';

const CATEGORIES = [...new Set(EXAMPLES.map((p) => p.category))].sort();
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

const DIFF_COLORS: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
};

export default function ExamplesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const filtered = useMemo(() => {
    return EXAMPLES.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.tagline.toLowerCase().includes(query.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (difficulty && p.difficulty !== difficulty) return false;
      return true;
    });
  }, [query, category, difficulty]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a]">Project Ideas</h1>
          <p className="text-[#64748b] mt-1">Browse complete pre-built projects — wiring, code, and all. No wizard needed.</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a] bg-white"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#475569] bg-white"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#475569] bg-white"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <Link key={project.id} href={`/examples/${project.id}`}
              className="group bg-white border border-[#e2e8f0] rounded-xl hover:border-[#fbcfe8] hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{project.icon}</span>
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFF_COLORS[project.difficulty]}`}>
                      {project.difficulty}
                    </span>
                    <span className="text-[10px] bg-[#f1f5f9] text-[#64748b] px-2 py-0.5 rounded-full">{project.category}</span>
                  </div>
                </div>
                <h3 className="font-bold text-[#0f172a] text-sm group-hover:text-[#ec4899] transition-colors">{project.title}</h3>
                <p className="text-xs text-[#64748b] mt-1">{project.tagline}</p>
                <p className="text-xs text-[#64748b] mt-2 leading-relaxed line-clamp-2">{project.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-medium text-[#ec4899]">{project.board}</span>
                  <span className="text-[#e2e8f0]">·</span>
                  <span className="text-[10px] text-[#94a3b8]">{project.estimatedHours} hrs</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3 flex-1 items-end">
                  <span className="text-[10px] text-[#ec4899] font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    View full project <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#94a3b8]">
            <p className="text-sm">No projects match your filters.</p>
            <button onClick={() => { setQuery(''); setCategory(''); setDifficulty(''); }}
              className="text-[#ec4899] text-sm mt-2 hover:underline">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}