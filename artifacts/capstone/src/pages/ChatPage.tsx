import { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { Send, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { AiAvatar } from '@/components/AiAvatar';
import { Logo } from '@/components/Logo';
import { sanitizeHtml } from '@/lib/sanitize';

interface Msg { role: 'user' | 'assistant'; content: string; ts: number; }

const SESSIONS_KEY = 'capstone_chat_sessions';
const ACTIVE_KEY = 'capstone_chat_active';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono text-pink-600">$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; msgs: Msg[] }>>(() => {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const a = localStorage.getItem(ACTIVE_KEY);
    return a || '';
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.msgs]);

  const newSession = () => {
    const id = genId();
    const session = { id, name: 'New Chat', msgs: [] as Msg[] };
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(sessions.find((s) => s.id !== id)?.id || '');
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!activeId) newSession();
    const userMsg: Msg = { role: 'user', content: input.trim(), ts: Date.now() };
    const assistantMsg: Msg = { role: 'assistant', content: '', ts: Date.now() };
    const currentId = activeId || sessions[0]?.id || '';
    setSessions((prev) => prev.map((s) => s.id === currentId ? { ...s, msgs: [...s.msgs, userMsg, assistantMsg], name: s.msgs.length === 0 ? input.slice(0, 40) : s.name } : s));
    setInput('');
    setLoading(true);
    try {
      const currentMsgs = sessions.find((s) => s.id === currentId)?.msgs || [];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...currentMsgs.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMsg.content }] }),
      });
      if (!res.ok || !res.body) throw new Error('Failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
              if (delta) { full += delta; setSessions((prev) => prev.map((s) => s.id === currentId ? { ...s, msgs: s.msgs.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: sanitizeHtml(full) } : m) } : s)); }
            } catch {}
          }
        }
      }
    } catch {
      setSessions((prev) => prev.map((s) => s.id === currentId ? { ...s, msgs: s.msgs.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: 'Sorry, an error occurred. Please try again.' } : m) } : s));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col">
        <div className="p-4 border-b border-[#e2e8f0]">
          <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
            <Logo size={28} textSize="text-base" />
          </Link>
          <button onClick={newSession} className="w-full py-2 bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white text-sm font-bold rounded-xl hover:shadow-md transition flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && <p className="text-xs text-gray-400 text-center mt-6 px-4">No chats yet. Start one!</p>}
          {sessions.map((s) => (
            <div key={s.id} onClick={() => setActiveId(s.id)} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition ${s.id === activeId ? 'bg-pink-50 text-[#ec4899]' : 'hover:bg-gray-50 text-gray-700'}`}>
              <span className="text-sm font-medium truncate flex-1">{s.name || 'Untitled'}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="hidden group-hover:block p-0.5 rounded text-gray-400 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-float">
            <AiAvatar size={80} />
            <div className="text-center">
              <h2 className="text-2xl font-black text-[#0f172a] mb-2">Chat with Lipo</h2>
              <p className="text-gray-500">Start a new conversation to get help with your capstone project.</p>
            </div>
            <button onClick={newSession} className="shimmer-btn text-white font-bold px-8 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-pink-200/50">
              <Sparkles className="w-5 h-5" /> Start chatting
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-[#e2e8f0] bg-white flex items-center gap-3">
              <AiAvatar size={32} />
              <div>
                <h3 className="font-bold text-sm text-[#0f172a]">{active.name || 'Chat'}</h3>
                <p className="text-xs text-gray-400">{active.msgs.length} messages</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {active.msgs.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                  <AiAvatar size={56} className="mx-auto mb-4 opacity-60" />
                  <p className="text-sm">Hi! I'm Lipo. Ask me anything about your project.</p>
                </div>
              )}
              {active.msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white rounded-br-sm' : 'bg-white text-[#0f172a] rounded-bl-sm border border-gray-100'}`}>
                    <span dangerouslySetInnerHTML={{ __html: m.content ? renderMarkdown(m.content) : (loading && i === active.msgs.length - 1 ? '▊' : '...') }} />
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t border-[#e2e8f0] bg-white flex gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Lipo anything..." disabled={loading}
                className="flex-1 px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent transition" />
              <button type="submit" disabled={loading || !input.trim()} className="px-5 py-3 bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white rounded-xl hover:shadow-md disabled:opacity-40 transition flex items-center gap-2">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
