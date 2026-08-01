import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, Sparkles, Cpu, BookOpen, Quote, Users, ArrowRight, Github, Zap, Shield, Star, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';

const FEATURES = [
  { icon: <Cpu className="w-6 h-6" />, title: 'Hardware Sandbox', desc: 'Design Arduino / Raspberry Pi circuits step-by-step — from idea to wiring diagram to generated code.', color: 'from-pink-500 to-rose-500' },
  { icon: <BookOpen className="w-6 h-6" />, title: 'Research Assistant', desc: 'Paste a paper URL or upload a PDF. Get a plain-language summary, key takeaways, and stored notes.', color: 'from-violet-500 to-purple-500' },
  { icon: <Quote className="w-6 h-6" />, title: 'Citation Generator', desc: 'APA, MLA, IEEE, AMA. Auto-fill from a URL or DOI. Copy or export in seconds.', color: 'from-blue-500 to-cyan-500' },
  { icon: <Users className="w-6 h-6" />, title: 'Community Hub', desc: 'Live forums where students post questions and mentors reply in real-time via WebSocket.', color: 'from-emerald-500 to-teal-500' },
];

const STATS = [
  { value: '4 000+', label: 'Students', color: 'text-[#ec4899]' },
  { value: '40+', label: 'Pre-built Projects', color: 'text-[#a855f7]' },
  { value: '5 min', label: 'Avg. citation time', color: 'text-[#3b82f6]' },
  { value: '100%', label: 'Free', color: 'text-[#10b981]' },
];

const TESTIMONIALS = [
  { name: 'Sara K.', role: 'Grade 11 student', avatar: 'S', text: 'Lipo helped me build my greenhouse monitoring system in a weekend. The wiring diagram generator is insane!', color: '#ec4899' },
  { name: 'Dr. Walid A.', role: 'Mentor at AUC', avatar: 'W', text: 'My students come to supervision sessions way more prepared. The research summaries are genuinely solid.', color: '#a855f7' },
  { name: 'Omar F.', role: 'Grade 12 student', avatar: 'O', text: 'I did my entire literature review with Capstone. Saved me two days of manual citation work.', color: '#3b82f6' },
];

const STEPS = [
  { step: '01', title: 'Create your account', desc: 'Sign up in 30 seconds. No credit card.' },
  { step: '02', title: 'Pick a tool', desc: 'Sandbox, Research, Citations, or Community Hub.' },
  { step: '03', title: 'Build your project', desc: 'Lipo guides you every step of the way.' },
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-[DM_Sans,sans-serif] overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={36} textSize="text-xl" />
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm font-medium text-gray-600 hover:text-[#ec4899] transition px-4 py-2 rounded-lg hover:bg-pink-50">Sign in</Link>
            <Link href="/auth" className="text-sm font-bold text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-5 py-2.5 rounded-xl hover:shadow-md hover:scale-105 transition-all">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-24 px-6 text-center overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 blueprint-grid opacity-50" />
        <div className="glow-orb mesh-orb-1 bg-[#ec4899] w-[600px] h-[600px] -top-48 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="glow-orb mesh-orb-2 bg-[#a855f7] w-[500px] h-[500px] top-32 -left-40 opacity-18" />
        <div className="glow-orb mesh-orb-3 bg-[#3b82f6] w-[450px] h-[450px] top-48 -right-32 opacity-16" />

        <div className="relative z-10 max-w-4xl mx-auto animate-blur-in">
          <div className="pill-badge bg-gradient-to-r from-pink-50 to-purple-50 border-pink-300 text-pink-700 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Powered by Groq — lightning fast AI
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            Your AI sidekick for{' '}
            <span className="animate-gradient-text">capstone projects</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            From choosing a topic to wiring sensors to formatting citations — Lipo AI walks you through every step so you can actually build the thing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/auth')}
              className="shimmer-btn w-full sm:w-auto text-white font-bold text-lg px-10 py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-pink-300/40 hover:shadow-2xl hover:shadow-pink-300/50 hover:scale-[1.02] transition-all duration-300">
              Start building — it's free <ArrowRight className="w-5 h-5" />
            </button>
            <Link href="/examples" className="w-full sm:w-auto glass-card text-sm font-bold text-gray-700 px-8 py-4 rounded-2xl border border-white/60 hover:border-pink-300 hover:text-[#ec4899] hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
              Browse project ideas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-white via-slate-50/50 to-white relative overflow-hidden">
        <div className="glow-orb bg-purple-400 w-[400px] h-[400px] top-0 left-1/4 opacity-10" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center animate-card glass-card rounded-2xl p-6 border border-white/60 hover:scale-105 transition-transform duration-300">
                <p className={`text-5xl font-black ${s.color} mb-2 tracking-tight`}>{s.value}</p>
                <p className="text-sm text-gray-600 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        <div className="glow-orb mesh-orb-1 bg-blue-400 w-[500px] h-[500px] top-20 right-0 opacity-12" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="pill-badge bg-pink-50 border-pink-200 text-pink-700 mb-4">What you get</div>
            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">Everything in one place</h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">Four tools built specifically for students who are building something real.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="hover-glow-card glass-card rounded-3xl p-8 cursor-pointer animate-card group border border-white/60" onClick={() => navigate('/auth')}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black mb-3 text-gray-900">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6">{f.desc}</p>
                <div className="flex items-center gap-1.5 text-[#ec4899] text-sm font-bold group-hover:gap-2.5 transition-all">
                  Try it now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="glow-orb mesh-orb-2 bg-purple-500 w-[400px] h-[400px] bottom-0 left-1/3 opacity-10" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="pill-badge bg-purple-50 border-purple-200 text-purple-700 mb-4">Simple process</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Get started in 3 steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <div key={i} className="relative animate-card glass-card rounded-2xl p-6 border border-white/60 hover:shadow-lg transition-shadow">
                <div className="text-8xl font-black bg-gradient-to-br from-pink-100 to-purple-100 bg-clip-text text-transparent leading-none mb-4 select-none">{s.step}</div>
                <h3 className="text-xl font-black mb-2 -mt-8 text-gray-900">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && <div className="hidden md:block absolute top-10 right-0 translate-x-1/2 text-pink-200"><ArrowRight className="w-6 h-6" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="glow-orb mesh-orb-3 bg-cyan-400 w-[450px] h-[450px] top-1/2 right-1/4 opacity-10" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="pill-badge bg-blue-50 border-blue-200 text-blue-700 mb-4">Real feedback</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">What students say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="hover-glow-card glass-card border border-white/60 rounded-3xl p-7 animate-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base shadow-lg" style={{ background: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 bg-gradient-to-br from-[#ec4899] via-[#a855f7] to-[#3b82f6] text-white relative overflow-hidden">
        <div className="glow-orb mesh-orb-1 bg-white w-[700px] h-[700px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-12" />
        <div className="glow-orb mesh-orb-2 bg-pink-300 w-[400px] h-[400px] top-0 left-0 opacity-15" />
        <div className="glow-orb mesh-orb-3 bg-blue-300 w-[400px] h-[400px] bottom-0 right-0 opacity-15" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">Ready to build your best project?</h2>
          <p className="text-xl md:text-2xl opacity-95 mb-12 font-medium">Join thousands of students who got their projects done with Lipo AI.</p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button onClick={() => navigate('/auth')}
              className="bg-white text-[#ec4899] font-black text-lg px-12 py-5 rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl">
              Start free <Zap className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-12 px-6 bg-[#0f172a] text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <Logo size={32} textSize="text-lg" />
            <p className="text-xs text-gray-400 mt-1.5">Built for students, by Salma Ali.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <button onClick={() => navigate('/auth')} className="hover:text-white transition">Dashboard</button>
            <button onClick={() => navigate('/auth')} className="hover:text-white transition">Sandbox</button>
            <button onClick={() => navigate('/auth')} className="hover:text-white transition">Research</button>
            <button onClick={() => navigate('/auth')} className="hover:text-white transition">Citations</button>
          </div>
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Capstone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
