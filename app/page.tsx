'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown, Sparkles, BookOpen, Beaker, BarChart3, MessageCircle, Send, FileText } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { AiAvatar } from '@/components/AiAvatar';
import { sanitizeHtml } from '@/lib/sanitize';
import { BlueprintBackground } from '@/components/ui/BlueprintBackground';
import { FadeInText } from '@/components/ui/FadeInText';
import { ShimmerButton } from '@/components/ui/ShimmerButton';

const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Tools', href: '#tools' },
  { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Lipo AI Chat',
    desc: 'Get step-by-step guidance on wiring, code, citations, and paper structure tailored to your project.',
  },
  {
    icon: <Beaker className="w-6 h-6" />,
    title: 'Sandbox Wizard',
    desc: 'Describe your idea, get board + sensor recommendations, then generate full wiring tables and starter code.',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Citation Generator',
    desc: 'Generate APA 7th, MLA 9th, IEEE, and AMA 11th citations from any URL or source metadata.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Research Hub',
    desc: 'APA formatting guides, Excel data tips, interactive chart rules, and academic sourcing directories.',
  },
];

const STEPS = [
  { num: 1, title: 'Sign Up', desc: 'Create your free account to unlock all tools.' },
  { num: 2, title: 'Describe Your Project', desc: 'Tell the AI mentor about your capstone idea.' },
  { num: 3, title: 'Get Recommendations', desc: 'Receive hardware suggestions and wiring plans.' },
  { num: 4, title: 'Build & Document', desc: 'Generate code, citations, and track your data.' },
  { num: 5, title: 'Present with Confidence', desc: 'Format your paper and charts with the citation tools.' },
];

const FAQS = [
  { q: 'Who is this platform for?', a: 'Anyone starting a project — high school students, university students, hobbyists, and makers. Whether it\'s for school, a competition, a passion project, or just to learn something new.' },
  { q: 'Do I need any prior coding experience?', a: 'No. The AI mentor guides you step by step. The Sandbox tool auto-generates code that you can copy and upload to your Arduino or ESP32.' },
  { q: 'Is everything free?', a: 'Yes. The citation generator works fully offline. AI chat and sandbox use Groq\'s free-tier API.' },
  { q: 'What hardware do I need?', a: 'Common boards like Arduino Uno, Arduino Nano, or ESP32 — all available at Bab El-Louk market in Cairo. Sensors like DHT22, HC-SR04, and PIR are also supported.' },
  { q: 'Can I use this for non-engineering projects?', a: 'The citation and hub tools work for any discipline. Hardware tools are tailored to engineering projects.' },
];

export default function HomePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  // Chat panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: "Hey! I'm Lipo! What are you building today?" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSignedIn(localStorage.getItem('capstone_signed_in') === 'true');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] }),
      });
      if (!res.ok || !res.body) throw new Error('Failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: reply };
          return updated;
        });
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again!' }]);
    } finally {
      setChatLoading(false);
    }
  };

  function renderMarkdown(text: string): string {
    if (!text) return '';
    const html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\- (.+)$/gm, '• $1')
      .replace(/\n/g, '<br />');
    return sanitizeHtml(html);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5">
            <Logo size={36} textSize="text-xl" />
          </button>

          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href} className="text-sm text-[#64748b] hover:text-[#db2777] transition font-medium">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {signedIn ? (
              <button onClick={() => router.push('/dashboard')} className="text-sm font-bold text-white bg-[#ec4899] px-5 py-2 rounded-lg hover:bg-[#db2777] transition shadow-sm">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => router.push('/auth')} className="text-sm font-semibold text-[#64748b] hover:text-[#db2777] transition">
                  Sign In
                </button>
                <button onClick={() => router.push('/auth')} className="text-sm font-bold text-white bg-[#ec4899] px-5 py-2 rounded-lg hover:bg-[#db2777] transition shadow-sm">
                  Get Started
                </button>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[#e2e8f0] bg-white px-4 py-4 space-y-3">
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="block text-sm text-[#64748b] hover:text-[#db2777] font-medium">
                {item.label}
              </a>
            ))}
            <hr className="border-[#e2e8f0]" />
            {signedIn ? (
              <button onClick={() => router.push('/dashboard')} className="block w-full text-center text-sm font-bold text-white bg-[#ec4899] py-2.5 rounded-lg">Dashboard</button>
            ) : (
              <>
                <button onClick={() => router.push('/auth')} className="block w-full text-center text-sm font-semibold text-[#64748b] py-2">Sign In</button>
                <button onClick={() => router.push('/auth')} className="block w-full text-center text-sm font-bold text-white bg-[#ec4899] py-2.5 rounded-lg">Get Started</button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="bg-[#f8fafc] relative overflow-hidden">
        <BlueprintBackground className="max-w-6xl mx-auto px-4 py-20 md:py-32 flex flex-col items-center gap-10 relative z-10">
          <div className="w-full max-w-2xl space-y-6 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-[#0f172a] tracking-tight">
              <span className="animate-blur-in block">Your Capstone Project,</span>{' '}
              <span className="animate-blur-in animate-gradient-text block mt-1">Guided Step by Step</span>
            </h1>
            <p className="animate-blur-in text-lg text-[#64748b] max-w-xl mx-auto leading-relaxed">
              AI-powered mentor for students, makers, and anyone building a project. From choosing a topic to wiring sensors to formatting citations — all in one place.
            </p>
            <div className="animate-blur-in flex flex-wrap gap-3 justify-center">
              <ShimmerButton onClick={() => router.push(signedIn ? '/dashboard' : '/auth')}>
                {signedIn ? 'Dashboard' : 'Get Started Free'}
              </ShimmerButton>
              <a href="#features" className="px-8 py-3 rounded-lg text-sm font-semibold text-[#64748b] border border-[#e2e8f0] hover:border-[#fbcfe8] hover:text-[#db2777] transition shadow-sm bg-white/50 backdrop-blur-sm">
                Learn More
              </a>
            </div>
          </div>
        </BlueprintBackground>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 bg-white relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight">Everything You Need in One Place</h2>
            <p className="text-[#64748b] mt-2 text-sm">Five integrated tools to take your project from idea to completion.</p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-4 bg-white border border-[#e2e8f0] rounded-2xl hover-glow-card group flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-[#f8fafc] flex items-center justify-center text-[#ec4899] group-hover:bg-[#ec4899] group-hover:text-white group-hover:scale-110 transition duration-300 shadow-sm">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#0f172a] mb-1">{f.title}</h3>
                  <p className="text-xs text-[#64748b] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight">How It Works</h2>
            <p className="text-[#64748b] mt-2 text-sm">From idea to presentation in 5 simple steps.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center p-6 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm hover:shadow-md transition relative">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#a855f7] text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                  {step.num}
                </div>
                <h3 className="font-bold text-sm text-[#0f172a] mb-1.5">{step.title}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tools Grid ─── */}
      <section id="tools" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight">Explore Your Tools</h2>
            <p className="text-[#64748b] mt-2 text-sm">Click any tool to start building.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: MessageCircle, title: 'Lipo AI Chat', href: '/chat' },
                { icon: Beaker, title: 'Sandbox Wizard', href: '/sandbox' },
                { icon: FileText, title: 'Citation Generator', href: '/citation' },
                { icon: BookOpen, title: 'Research Hub', href: '/hub' },
              ].map((tool) => (
                <a
                  key={tool.title}
                  href={tool.href}
                  className="p-6 bg-white border border-[#e2e8f0] rounded-2xl hover-glow-card group text-center flex flex-col justify-between"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-center">
                      <div className="p-3 bg-[#fdf2f8] rounded-xl text-[#db2777] group-hover:bg-[#db2777] group-hover:text-white transition duration-300">
                        <tool.icon className="w-8 h-8" />
                      </div>
                    </div>
                    <h3 className="font-bold text-[#0f172a] group-hover:text-[#db2777] transition duration-300">{tool.title}</h3>
                  </div>
                  <p className="text-xs text-[#ec4899] mt-3 font-semibold group-hover:underline">Open tool →</p>
                </a>
              ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 bg-[#f8fafc]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#0f172a] mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-[#e2e8f0] rounded-xl bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-[#0f172a] hover:bg-[#f8fafc] transition"
                >
                  {faq.q}
                  <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all ${openFaq === i ? 'max-h-40 pb-5 px-5' : 'max-h-0'}`}>
                  <p className="text-sm text-[#64748b] leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 bg-[#0f172a]">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Capstone?</h2>
          <p className="text-white/60 mb-8">Join students and makers using AI to build better projects.</p>
          <button onClick={() => router.push(signedIn ? '/dashboard' : '/auth')} className="px-10 py-3 rounded-lg text-sm font-bold text-white bg-[#ec4899] hover:bg-[#db2777] transition shadow-sm">
            {signedIn ? 'Dashboard' : 'Get Started Free'}
          </button>
        </div>
      </section>

      {/* ─── Floating Chat Button ─── */}
      {!chatOpen && showGreeting && (
        <div className="fixed bottom-9 right-[5.5rem] z-50 flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-xl px-4 py-2 shadow-md text-sm text-[#0f172a]">
          <span className="whitespace-nowrap">Hey! I'm Lipo — your project sidekick. Need a hand?</span>
          <button onClick={() => setShowGreeting(false)} className="p-0.5 rounded text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] transition shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white text-[#ec4899] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition z-50 border border-[#e2e8f0]"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <AiAvatar size={56} />}
      </button>

      <div
        className={`fixed bottom-24 right-6 w-[360px] h-[520px] bg-white rounded-2xl shadow-xl border border-[#e2e8f0] flex flex-col z-40 transition-all duration-300 ${
          chatOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <AiAvatar size={32} />
            <h3 className="font-semibold text-sm text-[#0f172a]">Lipo</h3>
          </div>
          <button onClick={() => setChatOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#ec4899] text-white rounded-br-sm'
                    : 'bg-[#f8fafc] text-[#0f172a] rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  msg.content
                )}
                {!msg.content && chatLoading && i === chatMessages.length - 1 ? '▊' : ''}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-[#e2e8f0] flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
            placeholder="Ask about your capstone..."
            className="flex-1 px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent transition"
            disabled={chatLoading}
          />
          <button
            onClick={sendChatMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="px-3 py-2 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="py-10 border-t border-[#e2e8f0] bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[#64748b]">
          <Logo size={28} textSize="text-base" />
          <p className="mt-1">Your project companion — from idea to build, for school, competition, or passion.</p>
          <p className="mt-4 text-xs text-[#94a3b8]">Founder: Salma Ali</p>
        </div>
      </footer>
    </div>
  );
}
