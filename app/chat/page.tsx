'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

const STORAGE_KEY = 'capstone-chat-history';

function renderMarkdown(text: string): string {
  if (!text) return '';
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br />');
  return sanitizeHtml(html);
}

interface ChatSession {
  id: string;
  title: string;
  messages: { role: string; content: string }[];
  createdAt: number;
}

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function generateTitle(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === 'user');
  return first ? first.content.slice(0, 50) + (first.content.length > 50 ? '...' : '') : 'New Chat';
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadSessions();
    setSessions(saved);
    if (saved.length > 0) {
      const last = saved[saved.length - 1];
      setActiveId(last.id);
      setMessages(last.messages);
    }
  }, []);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function persistMessages(msgs: { role: string; content: string }[]) {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeId ? { ...s, messages: msgs, title: generateTitle(msgs) } : s
      );
      return updated;
    });
  }

  function newChat() {
    const id = Date.now().toString();
    const newSession: ChatSession = { id, title: 'New Chat', messages: [], createdAt: Date.now() };
    setSessions((prev) => [...prev, newSession]);
    setActiveId(id);
    setMessages([]);
    setError('');
  }

  function deleteChat(id: string) {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        setActiveId(null);
        setMessages([]);
      } else if (activeId === id) {
        const last = filtered[filtered.length - 1];
        setActiveId(last.id);
        setMessages(last.messages);
      }
      return filtered;
    });
  }

  function switchChat(id: string) {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setActiveId(id);
      setMessages(session.messages);
      setError('');
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (!activeId) newChat();

    const userMessage = { role: 'user' as const, content: input };
    const currentMessages = [...messages, userMessage];

    setMessages(currentMessages);
    setInput('');
    setLoading(true);
    setError('');

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      if (!res.body) throw new Error('No readable response body stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedReply = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        accumulatedReply += textChunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulatedReply };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && activeId && messages.length > 0) {
      persistMessages(messages);
    }
  }, [loading, messages.length]);

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 bg-[#ec4899] text-white text-sm font-medium px-3 py-2 rounded-lg transition hover:bg-[#db2777]"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => switchChat(s.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition ${
                activeId === s.id
                  ? 'bg-gradient-to-r from-slate-50 to-blue-50 text-[#db2777]'
                  : 'hover:bg-[#fdf2f8] text-gray-600'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(s.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-[#db2777] transition"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#ec4899] to-[#db2777] bg-clip-text text-transparent">Capstone AI Mentor</h1>
              <p className="text-xs text-gray-500">Your AI project mentor</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard" className="text-xs bg-[#ec4899] text-white px-3 py-1.5 rounded-lg hover:bg-[#db2777] transition">
              ⬅ Dashboard
            </a>
            <a href="/sandbox" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-[#fdf2f8] hover:text-[#db2777] transition">
              🧪 Sandbox
            </a>
            <a href="/projects" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-[#fdf2f8] hover:text-[#db2777] transition">
              📁 Projects
            </a>
            <a href="/citation" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-[#fdf2f8] hover:text-[#db2777] transition">
              📚 Cite
            </a>
            <a href="/hub" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-[#fdf2f8] hover:text-[#db2777] transition">
              📋 Hub
            </a>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 text-blue-300" />
              <p className="text-sm text-gray-500">Ask a question about your Capstone project</p>
              <p className="text-xs text-gray-400 mt-1">Wiring, coding, sensors, citations, or paper structure</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#ec4899] text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {!msg.content && loading && idx === messages.length - 1 ? '▊' : ''}
              </div>
            </div>
          ))}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-lg max-w-md text-center">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about wiring, code, sensors, or citations..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent transition"
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              className="bg-[#ec4899] hover:bg-[#db2777] text-white px-5 py-3 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !input.trim()}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
