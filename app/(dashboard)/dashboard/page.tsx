'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { getLocalProjects } from '@/lib/sandbox/store';
import type { SandboxProject, SandboxStage } from '@/lib/sandbox/types';
import { Folder, Wrench, BookOpen, Trophy, ArrowRight, Clock, Sparkles, Beaker, Search, BookCopy, Users, Lightbulb, Rocket } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsSkeleton } from '@/components/ui/Skeleton';

const STAGE_ORDER: SandboxStage[] = ["idea", "analyzed", "components", "wiring", "code"];

function stageIndex(s: SandboxStage): number {
  return STAGE_ORDER.indexOf(s);
}

const STAGE_LABELS: Record<SandboxStage, string> = {
  idea: "Idea",
  analyzed: "Analysis",
  components: "Components",
  wiring: "Wiring",
  code: "Code",
};

const tools = [
  {
    id: 'sandbox', label: 'Sandbox', href: '/sandbox',
    desc: 'AI-powered hardware prototyping wizard',
    bullets: ['AI-guided prototyping path', 'SVG breadboard simulator', 'Auto-generated wiring & code'],
    color: '#ec4899', icon: Beaker,
  },
  {
    id: 'examples', label: 'Project Ideas', href: '/examples',
    desc: '8+ complete pre-built projects with wiring & code',
    bullets: ['Curated board & sensor picks', 'Full wiring tables', 'Ready-to-run Arduino code'],
    color: '#3b82f6', icon: Lightbulb,
  },
  {
    id: 'research', label: 'Research Assistant', href: '/research',
    desc: 'Summarize academic papers & abstracts',
    bullets: ['Extract objectives & methods', 'Jury justification notes', 'Citation export ready'],
    color: '#a855f7', icon: Search,
  },
  {
    id: 'hub', label: 'Community Hub', href: '/hub',
    desc: 'Community forum for project builders',
    bullets: ['Themed project channels', 'Verified mentor support', 'Real-time discussions'],
    color: '#f59e0b', icon: Users,
  },
  {
    id: 'citation', label: 'Citation Builder', href: '/citation',
    desc: 'APA / MLA / IEEE / AMA generator',
    bullets: ['4 academic citation styles', 'Auto-scrape page metadata', 'Copy-paste ready output'],
    color: '#10b981', icon: BookCopy,
  },
];

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [projects, setProjects] = useState<SandboxProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const u = localStorage.getItem('capstone_user');
      if (u) setUserName(JSON.parse(u).name || '');
    } catch {}
    setProjects(getLocalProjects());
    setLoading(false);
  }, []);

  const projectCount = projects.length;
  const completedCount = projects.filter((p) => p.stage === 'code').length;
  const inProgress = projects.filter((p) => p.stage !== 'code').length;
  const wiringSets = projects.filter((p) => stageIndex(p.stage) >= stageIndex('wiring')).length;
  const hasProjects = projectCount > 0;
  const firstInProgress = useMemo(() => projects.find((p) => p.stage !== 'code'), [projects]);
  const recentProjects = useMemo(() => projects.slice(0, 3), [projects]);

  const statCards = [
    { icon: <Folder className="w-4 h-4" />, label: 'Saved Projects', value: projectCount, color: '#ec4899' },
    { icon: <Wrench className="w-4 h-4" />, label: 'Completed', value: completedCount, color: '#3b82f6' },
    { icon: <BookOpen className="w-4 h-4" />, label: 'In Progress', value: inProgress, color: '#a855f7' },
    { icon: <Trophy className="w-4 h-4" />, label: 'Wiring Sets', value: wiringSets, color: '#f59e0b' },
  ];

  return (
    <div className="page-enter p-6 md:p-8 min-h-[calc(100vh-57px)] flex flex-col">
      <div className="max-w-5xl mx-auto space-y-8 flex-1 flex flex-col">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">
            {hasProjects
              ? (userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Welcome back')
              : 'Welcome to Capstone'}
          </h1>
          <p className="text-sm text-[#64748b] mt-1">
            {hasProjects
              ? `Here's where you left off.`
              : `Let's get your first project off the ground.`}
          </p>
        </div>

        {/* ── Stats row ── */}
        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <div
                key={stat.label}
                className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-4 interactive"
                style={{ cursor: 'default' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="animate-stat-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${stat.color}14`, color: stat.color, animationDelay: `${i * 80}ms` }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-[#0f172a]">
                      <AnimatedCounter target={stat.value} />
                    </p>
                    <p className="text-xs text-[#64748b]">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/sandbox/new"
            className="animate-card rounded-lg p-5 text-white"
            style={{
              background: 'linear-gradient(135deg, #f9a8d4, #ec4899)',
              animationDelay: '0.08s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.015)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(236,72,153,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Sparkles className="w-7 h-7 mb-3 opacity-90" />
            <h3 className="font-bold">Start New Project</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Get AI recommendations for your next build.</p>
          </Link>

          {(firstInProgress ? (
            <Link href={`/sandbox/${firstInProgress.id}`} className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-5 interactive" style={{ animationDelay: '0.16s' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#64748b]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-[#0f172a]">Continue where you left off</h3>
                  <p className="text-xs text-[#64748b] truncate mt-0.5">{firstInProgress.title || firstInProgress.rawIdea}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-[#94a3b8]">Step {stageIndex(firstInProgress.stage) + 1}/5</span>
                    <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden max-w-24">
                      <div className="h-full rounded-full bg-[#ec4899]" style={{ width: `${((stageIndex(firstInProgress.stage) + 1) / 5) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-[#ec4899]">{STAGE_LABELS[firstInProgress.stage]}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94a3b8] shrink-0 mt-1" />
              </div>
            </Link>
          ) : hasProjects ? (
            <Link href="/projects" className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-5 interactive" style={{ animationDelay: '0.16s' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 text-[#64748b]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-[#0f172a]">View All Projects</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">All your finished and in-progress work in one place.</p>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/examples" className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-5 interactive" style={{ animationDelay: '0.16s' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f8fafc] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#ec4899]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-[#0f172a]">Browse Project Ideas</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Complete pre-built projects with wiring and code ready to go.</p>
                </div>
              </div>
            </Link>
          ))}
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
                <Link key={p.id} href={`/sandbox/${p.id}`} className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-4 interactive">
                  <p className="text-sm font-semibold text-[#0f172a] truncate">{p.title || p.rawIdea}</p>
                  <p className="text-xs text-[#64748b] mt-1">
                    {p.stage === 'code' ? 'Code ready' : `Step ${stageIndex(p.stage) + 1}/5 · ${STAGE_LABELS[p.stage]}`}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-[#94a3b8]">
                      {p.stage === 'code' ? 'Completed' : 'In progress'}
                    </span>
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
            {tools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="animate-card bg-white border border-[#e2e8f0] rounded-lg p-4 interactive"
                  style={{ backgroundColor: `${tool.color}0a`, animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tool.color}14` }}>
                      <Icon className="w-4 h-4" style={{ color: tool.color }} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#0f172a]">{tool.label}</h3>
                  </div>
                  <p className="text-xs text-[#64748b] mb-2">{tool.desc}</p>
                  <ul className="space-y-1">
                    {tool.bullets.map((b) => (
                      <li key={b} className="text-[11px] text-[#64748b] flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: tool.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Empty state ── */}
        {!hasProjects && !loading && (
          <EmptyState
            icon={<Rocket className="w-6 h-6" />}
            title="Getting Started"
            description="Click Start New Project to get AI-powered recommendations, or browse Project Ideas for ready-made builds."
          />
        )}

      </div>
    </div>
  );
}
