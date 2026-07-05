'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Clock, Wifi, Cpu } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getProjects, deleteProject } from '@/lib/projects/store';
import type { SavedProject } from '@/lib/sandbox/types';

const STATUS_META: Record<SavedProject['status'], { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-yellow-100 text-yellow-700' },
  components: { label: 'Parts picked', color: 'bg-blue-100 text-blue-700' },
  generated: { label: 'Code ready', color: 'bg-green-100 text-green-700' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setProjects(getProjects()); }, []);

  const handleDelete = () => {
    if (deleteId) { deleteProject(deleteId); setProjects(getProjects()); setDeleteId(null); }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-500 mt-1">{projects.length} saved project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/sandbox"
            className="flex items-center gap-2 bg-[#ec4899] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-[#fdf2f8] flex items-center justify-center">
              <Cpu className="w-8 h-8 text-[#ec4899]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No projects yet</h3>
            <p className="text-sm text-gray-400 mt-1 mb-6">Start by building a prototype in the Sandbox</p>
            <Link
              href="/sandbox"
              className="inline-flex items-center gap-2 bg-[#ec4899] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#db2777] transition shadow-sm"
            >
              Open Sandbox →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/sandbox?project=${p.id}`}
                className="group relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm hover:border-[#fbcfe8] transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_META[p.status].color}`}>
                    {STATUS_META[p.status].label}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm group-hover:text-[#ec4899] transition-colors line-clamp-2">
                  {p.idea}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> {p.board}
                  </span>
                  {p.sensors.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded max-w-[100px] truncate">
                      {s}
                    </span>
                  ))}
                  {p.sensors.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{p.sensors.length - 3}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-4 text-[10px] text-gray-400">
                  <Clock className="w-3 h-3" />
                  {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteId}
          title="Delete project?"
          message="This action cannot be undone. The project will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </div>
  );
}
