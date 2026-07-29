import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Sparkles, Cpu, BookOpen, Quote, Users, FolderOpen, ArrowRight, TrendingUp, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

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
    try {
      const sp = JSON.parse(localStorage.getItem('sandbox_projects') || '[]') as SandboxProject[];
      setSandboxProjects(sp.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3));
    } catch {}
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
    { label: 'Active Tools', value: 5, icon: <Zap className="w-4 h-4" />, color: 'text-[#3b82f6]', bg: 'bg-blue-50' },
    { label: 'Days Streak', value: 1, icon: <TrendingUp className="w-4 h-4" />, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto page-enter">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#0f172a] mb-1">
          {greeting}, <span className="animate-gradient-text">{firstName}</span> 👋
        </h2>
        <p className="text-gray-500">What are we building today?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className={`animate-card hover-glow-card glass-card rounded-2xl p-4 border border-gray-100`}>
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3 animate-stat-icon`}>{s.icon}</div>
            <p className={`text-2xl font-black ${s.color} mb-0.5`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-black text-[#0f172a] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TOOLS.map((tool, i) => (
            <Link key={tool.id} href={tool.href}
              className={`animate-card hover-glow-card glass-card rounded-2xl p-5 border border-gray-100 cursor-pointer group`}>
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg ${tool.shadow} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                {tool.icon}
              </div>
              <p className="font-black text-sm text-[#0f172a] mb-0.5">{tool.label}</p>
              <p className="text-xs text-gray-400">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {sandboxProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-[#0f172a]">Recent Sandbox Projects</h3>
            <Link href="/projects" className="text-sm text-[#ec4899] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {sandboxProjects.map((p, i) => (
              <Link key={p.id} href={`/sandbox/${p.id}`}
                className="animate-card flex items-center justify-between p-4 glass-card hover-glow-card rounded-xl border border-gray-100 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a] truncate max-w-[200px]">{p.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage] || 'bg-gray-100 text-gray-500'}`}>{p.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> {timeAgo(p.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no projects */}
      {sandboxProjects.length === 0 && (
        <div className="glass-card rounded-2xl border border-dashed border-gray-200 p-10 text-center animate-float">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-[#0f172a] mb-2">No projects yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Start your first capstone project. Pick any tool above to begin.</p>
          <Link href="/sandbox" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white font-bold text-sm px-6 py-3 rounded-xl hover:shadow-md transition">
            Try the Sandbox <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
