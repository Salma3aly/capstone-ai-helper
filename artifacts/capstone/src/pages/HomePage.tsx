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
        {/* Background orbs */}
        <div className="absolute inset-0 blueprint-grid opacity-60" />
        <div className="glow-orb bg-[#ec4899] w-[500px] h-[500px] -top-40 left-1/2 -translate-x-1/2" />
        <div className="glow-orb bg-[#a855f7] w-[400px] h-[400px] top-40 -left-32" />
        <div className="glow-orb bg-[#3b82f6] w-[350px] h-[350px] top-60 -right-20" />

        <div className="relative z-10 max-w-4xl mx-auto animate-blur-in">
          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-200 text-[#db2777] text-xs font-bold px-4 py-1.5 rounded-full mb-6">
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
              className="shimmer-btn w-full sm:w-auto text-white font-bold text-base px-8 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-200/50">
              Start building — it's free <ArrowRight className="w-5 h-5" />
            </button>
            <Link href="/examples" className="w-full sm:w-auto text-sm font-bold text-gray-600 px-8 py-4 rounded-2xl border-2 border-gray-200 hover:border-[#ec4899] hover:text-[#ec4899] transition-all flex items-center justify-center gap-2 bg-white">
              Browse project ideas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center animate-card">
                <p className={`text-4xl font-black ${s.color} mb-1`}>{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-[#ec4899] uppercase tracking-widest mb-3">What you get</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Everything in one place</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">Four tools built specifically for students who are building something real.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="hover-glow-card glass-card rounded-2xl p-8 cursor-pointer animate-card group border border-gray-100" onClick={() => navigate('/auth')}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
                <div className="mt-6 flex items-center gap-1 text-[#ec4899] text-sm font-bold">
                  Try it now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-[#a855f7] uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-4xl md:text-5xl font-black">Get started in 3 steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative animate-card">
                <div className="text-7xl font-black text-pink-50 leading-none mb-4 select-none">{s.step}</div>
                <h3 className="text-xl font-black mb-2 -mt-10">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
                {i < STEPS.length - 1 && <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 text-gray-200"><ArrowRight className="w-6 h-6" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-[#3b82f6] uppercase tracking-widest mb-3">Real feedback</p>
            <h2 className="text-4xl md:text-5xl font-black">What students say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="hover-glow-card glass-card border border-gray-100 rounded-2xl p-6 animate-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#0f172a]">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-[#ec4899] via-[#a855f7] to-[#3b82f6] text-white relative overflow-hidden">
        <div className="glow-orb bg-white w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Ready to build your best project?</h2>
          <p className="text-xl opacity-90 mb-10">Join thousands of students who got their projects done with Lipo AI.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/auth')}
              className="bg-white text-[#ec4899] font-black text-base px-10 py-4 rounded-2xl hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
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
