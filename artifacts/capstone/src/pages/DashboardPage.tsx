import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Sparkles, Cpu, BookOpen, Quote, Users, FolderOpen, ArrowRight, TrendingUp, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { getProjectsAsync } from '@/lib/projects/store';

interface SandboxProject { id: string; title: string; stage: string; updatedAt: number; }
interface ResearchSession { id: string; topic: string; createdAt: number; }

const TOOLS = [
  { id: 'sandbox', icon: <Cpu className="w-5 h-5" />, label: 'Sandbox', desc: 'Design hardware circuits', href: '/sandbox', gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-200/50' },
  { id: 'research', icon: <BookOpen className="w-5 h-5" />, label: 'Research', desc: 'Summarize papers', href: '/research', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-200/50' },
  { id: 'citation', icon: <Quote className="w-5 h-5" />, label: 'Citations', desc: 'Generate APA / MLA', href: '/citation', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-200/50' },
  { id: 'hub', icon: <Users className="w-5 h-5" />, label: 'Community', desc: 'Chat with mentors', href: '/hub', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200/50' },
  { id: 'examples', icon: <Sparkles className="w-5 h-5" />, label: 'Project Ideas', desc: 'Browse 40+ projects', href: '/examples', gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200/50' },
  { id: 'projects', icon: <FolderOpen className="w-5 h-5" />, label: 'My Projects', desc: 'Saved work', href: '/projects', gradient: 'from-slate-500 to-gray-600', shadow: 'shadow-slate-200/50' },
];

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-600',
  analyzed: 'bg-blue-100 text-blue-700',
  components: 'bg-violet-100 text-violet-700',
  wiring: 'bg-orange-100 text-orange-700',
  code: 'bg-emerald-100 text-emerald-700',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [sandboxProjects, setSandboxProjects] = useState<SandboxProject[]>([]);
  const [researchSessions, setResearchSessions] = useState<ResearchSession[]>([]);
  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    getProjectsAsync()
      .then((projects) => setSandboxProjects(
        projects.map((p) => ({ id: p.id, title: p.idea, stage: p.status, updatedAt: p.updatedAt }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 3)
      ))
      .catch(() => {});
    try {
      const token = localStorage.getItem('capstone_token');
      if (token) {
        fetch('/api/research', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((d) => setResearchSessions((d.sessions || []).slice(0, 3)))
          .catch(() => {});
      }
    } catch {}
  }, []);

  const stats = [
    { label: 'Sandbox Projects', value: sandboxProjects.length, icon: <Cpu className="w-4 h-4" />, color: 'text-[#ec4899]', bg: 'bg-pink-50' },
    { label: 'Research Sessions', value: researchSessions.length, icon: <BookOpen className="w-4 h-4" />, color: 'text-[#a855f7]', bg: 'bg-violet-50' },
    { label: 'Active Tools', value: TOOLS.length, icon: <Zap className="w-4 h-4" />, color: 'text-[#3b82f6]', bg: 'bg-blue-50' },
    { label: 'Days Streak', value: 1, icon: <TrendingUp className="w-4 h-4" />, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto page-enter relative">
      {/* Background gradient mesh */}
      <div className="glow-orb mesh-orb-1 bg-pink-300 w-[400px] h-[400px] -top-20 -right-20 opacity-8 pointer-events-none fixed" />
      <div className="glow-orb mesh-orb-2 bg-purple-300 w-[350px] h-[350px] top-1/3 -left-20 opacity-8 pointer-events-none fixed" />
      
      {/* Greeting */}
      <div className="mb-8 relative z-10">
        <h2 className="text-4xl font-black text-[#0f172a] mb-2 tracking-tight">
          {greeting}, <span className="animate-gradient-text">{firstName}</span>
        </h2>
        <p className="text-gray-600 font-medium">What are we building today?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10 relative z-10">
        {stats.map((s, i) => (
          <div key={i} className={`animate-card hover-glow-card glass-card rounded-3xl p-5 border border-white/60 shadow-sm hover:shadow-lg transition-all duration-300`}>
            <div className={`w-11 h-11 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4 animate-stat-icon shadow-sm`}>{s.icon}</div>
            <p className={`text-3xl font-black ${s.color} mb-1 tracking-tight`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-10 relative z-10">
        <h3 className="text-xl font-black text-[#0f172a] mb-5 tracking-tight">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {TOOLS.map((tool, i) => (
            <Link key={tool.id} href={tool.href}
              className={`animate-card hover-glow-card glass-card rounded-3xl p-6 border border-white/60 cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300`}>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg ${tool.shadow} flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                {tool.icon}
              </div>
              <p className="font-black text-sm text-[#0f172a] mb-1">{tool.label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {sandboxProjects.length > 0 && (
        <div className="mb-10 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-[#0f172a] tracking-tight">Recent Sandbox Projects</h3>
            <Link href="/projects" className="pill-badge bg-pink-50 border-pink-200 text-pink-700 hover:scale-105">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-4">
            {sandboxProjects.map((p, i) => (
              <Link key={p.id} href={`/sandbox/${p.id}`}
                className="animate-card flex items-center justify-between p-5 glass-card hover-glow-card rounded-2xl border border-white/60 cursor-pointer shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0f172a] truncate max-w-[220px] mb-1">{p.title}</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STAGE_COLORS[p.stage] || 'bg-gray-100 text-gray-500'}`}>{p.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Clock className="w-3.5 h-3.5" /> {timeAgo(p.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no projects */}
      {sandboxProjects.length === 0 && (
        <div className="glass-card rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center animate-float relative z-10 shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-pink-400" />
          </div>
          <h3 className="text-2xl font-black text-[#0f172a] mb-3 tracking-tight">No projects yet</h3>
          <p className="text-sm text-gray-600 mb-8 max-w-xs mx-auto leading-relaxed">Start your first capstone project. Pick any tool above to begin building something amazing.</p>
          <Link href="/sandbox" className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white font-black text-base px-8 py-4 rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg shadow-pink-200/50">
            Try the Sandbox <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
