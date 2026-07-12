'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, Send, LogOut, Menu, MoreVertical, Trash2, Settings, Folder, LayoutDashboard, FolderKanban, Lightbulb, Beaker, Search, BookCopy, Users } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { ChatProvider, useChat, renderMarkdown } from '@/lib/context/ChatContext';
import OnboardingWalkthrough from '@/components/OnboardingWalkthrough';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Logo } from '@/components/Logo';
import { AiAvatar } from '@/components/AiAvatar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sandbox': 'Sandbox',
  '/examples': 'Project Ideas',
  '/research': 'Research Assistant',
  '/citation': 'Citation Generator',
  '/hub': 'Community Hub',
  '/projects': 'My Projects',
};

const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  projects: <FolderKanban className="w-4 h-4" />,
  examples: <Lightbulb className="w-4 h-4" />,
  sandbox: <Beaker className="w-4 h-4" />,
  research: <Search className="w-4 h-4" />,
  citation: <BookCopy className="w-4 h-4" />,
  hub: <Users className="w-4 h-4" />,
};

const features = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', desc: 'Home' },
  { id: 'projects', label: 'My Projects', href: '/projects', desc: 'Saved prototypes' },
  { id: 'examples', label: 'Project Ideas', href: '/examples', desc: 'Pre-built projects' },
  { id: 'sandbox', label: 'Sandbox', href: '/sandbox', desc: 'Hardware prototyping wizard' },
  { id: 'research', label: 'Research', href: '/research', desc: 'Summarize papers & cite' },
  { id: 'citation', label: 'Citation', href: '/citation', desc: 'APA / MLA / IEEE / AMA generator' },
  { id: 'hub', label: 'Community', href: '/hub', desc: 'Forum with mentors' },
];

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?";
  const avatar = typeof window !== 'undefined' ? localStorage.getItem('capstone_avatar') : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-[#ec4899] text-white text-sm font-bold flex items-center justify-center hover:shadow-md hover:scale-105 transition shadow-sm overflow-hidden"
        aria-label="Profile menu"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-[#e2e8f0]">
            <p className="text-sm font-semibold text-[#0f172a] truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[#64748b] truncate">{user?.email || ""}</p>
          </div>
          <div className="py-1">
            <Link href="/projects" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#0f172a] hover:bg-[#f8fafc] transition"
            >
              <Folder className="w-4 h-4 text-[#64748b]" />
              My Projects
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#0f172a] hover:bg-[#f8fafc] transition"
            >
              <Settings className="w-4 h-4 text-[#64748b]" />
              Settings
            </Link>
            <hr className="my-1 border-[#e2e8f0]" />
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ children, sidebarOpen, onClose }: { children: React.ReactNode; sidebarOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const pageTitle = PAGE_TITLES[pathname] || 'Capstone';

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={onClose} />}

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-[#e2e8f0] flex flex-col overflow-hidden shrink-0 transition-transform duration-200`}>
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition">
            <Logo size={32} textSize="text-lg" />
            <p className="text-[10px] text-[#64748b] mt-0.5 ml-0.5">Project Hub</p>
          </Link>
          <button onClick={onClose} aria-label="Close sidebar" className="md:hidden p-1 text-[#64748b] hover:text-[#0f172a]"><X className="w-4 h-4" /></button>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
          {features.map((f) => {
            const isActive = pathname === f.href;
            return (
              <Link key={f.id} href={f.href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-[#fdf2f8] text-[#ec4899] font-semibold'
                    : 'text-[#64748b] hover:bg-[#fdf2f8] hover:text-[#ec4899]'
                }`}
              >
                <span className="shrink-0">{NAV_ICONS[f.id]}</span>
                <span className="truncate">{f.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#64748b]">
            <div className="w-5 h-5 rounded-full bg-[#ec4899] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
              {(user?.name?.charAt(0) || "?").toUpperCase()}
            </div>
            <span className="truncate">{user?.name || "User"}</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label="Toggle sidebar" className="md:hidden p-1.5 rounded-lg text-[#64748b] hover:bg-[#f8fafc] transition">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#0f172a]">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ProfileMenu />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

function ChatPanel() {
  const { chatOpen, setChatOpen, messages, sendMessage, loading, input, setInput, chatEndRef, clearHistory } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      {!chatOpen && showGreeting && (
        <div className="fixed bottom-9 right-[5.5rem] z-50 flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-xl px-4 py-2 shadow-md text-sm text-[#0f172a]">
          <span className="whitespace-nowrap">Hey! I'm Lipo — your project sidekick. Need a hand?</span>
          <button onClick={() => setShowGreeting(false)} className="p-0.5 rounded text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] transition shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button onClick={() => setChatOpen(!chatOpen)}
        aria-label={chatOpen ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white text-[#ec4899] flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition z-50 border border-[#e2e8f0]"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <AiAvatar size={56} />}
      </button>

      <div className={`fixed bottom-24 right-6 w-[380px] h-[560px] bg-white rounded-2xl shadow-xl border border-[#e2e8f0] flex flex-col z-40 transition-all duration-300 max-[420px]:right-3 max-[420px]:w-[calc(100vw-24px)] ${
        chatOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <AiAvatar size={28} />
            <h3 className="font-semibold text-sm text-[#0f172a]">Lipo</h3>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Chat menu" className="p-1 rounded text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"><MoreVertical className="w-4 h-4" /></button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 z-50">
                  <button onClick={() => { clearHistory(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" /> Clear history
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat panel" className="p-1 rounded text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#ec4899] text-white rounded-br-sm'
                    : 'bg-[#f8fafc] text-[#0f172a] rounded-bl-sm'
              }`}>
                <span dangerouslySetInnerHTML={{ __html: msg.content ? renderMarkdown(msg.content) : '' }} />
                {!msg.content && loading && i === messages.length - 1 ? '▊' : ''}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="p-3 border-t border-[#e2e8f0] flex gap-2"
        >
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your capstone..."
            className="flex-1 px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent transition"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition disabled:opacity-50 disabled:cursor-not-allowed"
          ><Send className="w-4 h-4" /></button>
        </form>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <AuthProvider>
      <ChatProvider>
        <div className="flex h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
          <Sidebar sidebarOpen={sidebarOpen} onClose={toggleSidebar}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </Sidebar>
          <ChatPanel />
          <OnboardingWalkthrough />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
}
