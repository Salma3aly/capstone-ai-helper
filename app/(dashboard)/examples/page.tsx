'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Clock, Cpu, Sparkles } from 'lucide-react';
import { EXAMPLES } from '@/lib/examples/data';
import type { ExampleProject } from '@/lib/examples/data';

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Project Ideas</h1>
          <p className="text-gray-500 mt-1">Browse example capstone projects. Click any to start building in the Sandbox.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-gray-900"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-gray-700"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-gray-700"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No projects match your filters.</p>
            <button onClick={() => { setQuery(''); setCategory(''); setDifficulty(''); }} className="text-[#ec4899] text-sm mt-2 hover:underline">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ExampleProject }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg hover:shadow-sm hover:border-[#fbcfe8] transition-all duration-200 overflow-hidden flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{project.icon}</span>
          <div className="flex gap-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFF_COLORS[project.difficulty]}`}>
              {project.difficulty}
            </span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {project.category}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#ec4899] transition-colors">{project.title}</h3>
        <p className="text-xs text-gray-500 mt-1">{project.tagline}</p>

        {/* Description (expandable) */}
        <div className="mt-2">
          <p className={`text-xs text-gray-600 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {project.description}
          </p>
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-[#ec4899] hover:underline mt-0.5">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>

        {/* Board chip */}
        <div className="flex items-center gap-2 mt-3">
          <Cpu className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">{project.suggestedBoard}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">~{project.estimatedHours} hours</span>
        </div>

        {/* Sensors */}
        <div className="flex flex-wrap gap-1 mt-3 flex-1">
          {project.suggestedSensors.slice(0, 4).map((s, i) => (
            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded max-w-[120px] truncate">{s}</span>
          ))}
          {project.suggestedSensors.length > 4 && (
            <span className="text-[10px] text-gray-400">+{project.suggestedSensors.length - 4}</span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/sandbox?idea=${encodeURIComponent(project.idea)}`}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[#ec4899] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#db2777] transition shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Start this project
        </Link>
      </div>
    </div>
  );
}
