'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { getProjects } from '@/lib/projects/store';
import { Folder, Wrench, BookOpen, Trophy, ArrowRight, Clock, Sparkles } from 'lucide-react';

const tools = [
  {
    id: 'sandbox', label: 'Sandbox', href: '/sandbox',
    desc: 'AI-powered hardware prototyping wizard',
    features: ['AI Prototyping Path', 'SVG Breadboard Simulator', 'Auto Code & Wiring'],
  },
  {
    id: 'examples', label: 'Project Ideas', href: '/examples',
    desc: 'Browse 15+ ready-made project ideas',
    features: ['Difficulty tiers', 'Component lists', 'Pre-fill Sandbox'],
  },
  {
    id: 'research', label: 'Research Assistant', href: '/research',
    desc: 'Summarize academic papers & abstracts',
    features: ['Objectives & Methods', 'Jury Justifications', 'Citation export'],
  },
  {
    id: 'hub', label: 'Community Hub', href: '/hub',
    desc: 'Community forum for project builders',
    features: ['Themed channels', 'Verified mentors', 'Real-time discussions'],
  },
  {
    id: 'citation', label: 'Citation Builder', href: '/citation',
    desc: 'APA / MLA / IEEE / AMA generator',
    features: ['4 citation styles', 'Page metadata scraper', 'Copy-paste ready'],
  },
];

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [projects, setProjects] = useState<ReturnType<typeof getProjects>>([]);

  useEffect(() => {
    try {
      const u = localStorage.getItem('capstone_user');
      if (u) setUserName(JSON.parse(u).name || '');
    } catch {}
    setProjects(getProjects());
  }, []);

  const recentProjects = useMemo(() => projects.slice(0, 3), [projects]);
  const projectCount = projects.length;
  const completedCount = projects.filter((p) => p.status === 'generated').length;

  const statusLabel: Record<string, string> = {
    idea: 'Idea',
    components: 'Parts picked',
    generated: 'Code ready',
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">
            {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Welcome'}
          </h1>
          <p className="text-sm text-[#64748b] mt-1">Here&apos;s where you left off.</p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Folder className="w-4 h-4" />, label: 'Saved Projects', value: projectCount, color: '#ec4899' },
            { icon: <Wrench className="w-4 h-4" />, label: 'Completed', value: completedCount, color: '#3b82f6' },
            { icon: <BookOpen className="w-4 h-4" />, label: 'In Progress', value: projectCount - completedCount, color: '#a855f7' },
            { icon: <Trophy className="w-4 h-4" />, label: 'Wiring Sets', value: projects.reduce((s, p) => s + (p.wiring?.length || 0), 0), color: '#f59e0b' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#e2e8f0] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}14`, color: stat.color }}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0f172a]">{stat.value}</p>
                  <p className="text-xs text-[#64748b]">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/sandbox" className="rounded-lg p-5 text-white transition" style={{ backgroundColor: '#ec4899' }}>
            <Sparkles className="w-6 h-6 mb-3 opacity-90" />
            <h3 className="font-bold">Start New Project</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Get AI recommendations for your next build.</p>
          </Link>

          {recentProjects.length > 0 ? (
            <Link href={`/sandbox?project=${recentProjects[0].id}`} className="bg-white border border-[#e2e8f0] rounded-lg p-5 hover:border-[#fbcfe8] transition">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#64748b]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-[#0f172a]">Resume Last Project</h3>
                  <p className="text-xs text-[#64748b] truncate mt-0.5">{recentProjects[0].idea}</p>
                  <span className="text-[10px] text-[#94a3b8] mt-1.5 block">{statusLabel[recentProjects[0].status] || recentProjects[0].status}</span>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/examples" className="bg-white border border-[#e2e8f0] rounded-lg p-5 hover:border-[#fbcfe8] transition">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#ec4899]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-[#0f172a]">Browse Project Ideas</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Not sure what to build? Get inspired.</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Recent Projects ── */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#0f172a]">Recent Projects</h2>
              <Link href="/projects" className="text-xs text-[#ec4899] hover:text-[#db2777] transition">
                View all
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {recentProjects.map((p) => (
                <Link key={p.id} href={`/sandbox?project=${p.id}`} className="bg-white border border-[#e2e8f0] rounded-lg p-4 hover:border-[#fbcfe8] transition">
                  <p className="text-sm font-medium text-[#0f172a] truncate">{p.idea}</p>
                  <p className="text-xs text-[#64748b] mt-1">{p.board} &middot; {p.sensors.length} sensors</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-[#94a3b8]">{statusLabel[p.status] || p.status}</span>
                    <span className="text-[10px] text-[#94a3b8]">{new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Tools Grid ── */}
        <div>
          <h2 className="text-sm font-semibold text-[#0f172a] mb-3">All Tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link key={tool.id} href={tool.href} className="bg-white border border-[#e2e8f0] rounded-lg p-4 hover:border-[#fbcfe8] transition">
                <h3 className="text-sm font-semibold text-[#0f172a]">{tool.label}</h3>
                <p className="text-xs text-[#64748b] mt-1">{tool.desc}</p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                  {tool.features.map((f) => (
                    <li key={f} className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#cbd5e1]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
