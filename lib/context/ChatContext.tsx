'use client';
import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContextValue {
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  messages: ChatMsg[];
  sendMessage: (text: string) => Promise<void>;
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  clearHistory: () => void;
}

const ChatContext = createContext<ChatContextValue>(null!);
const STORAGE_KEY = 'capstone-chat-panel';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('capstone_token');
}

function loadMessages(): ChatMsg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(msgs: ChatMsg[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
}

async function syncToServer(msgs: ChatMsg[]) {
  const token = getToken();
  if (!token) return;
  try {
    await fetch('/api/chat/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: msgs }),
    });
  } catch {}
}

async function loadFromServer(): Promise<ChatMsg[] | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/chat/history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sessions = data.sessions;
    if (sessions && sessions.length > 0) {
      const msgs = sessions[0].messages;
      if (msgs && msgs.length > 0) return msgs;
    }
    return null;
  } catch {
    return null;
  }
}

async function clearOnServer() {
  const token = getToken();
  if (!token) return;
  try {
    await fetch('/api/chat/history', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialised) {
      (async () => {
        // Try server first, fall back to localStorage
        const serverMsgs = await loadFromServer();
        if (serverMsgs) {
          setMessages(serverMsgs);
          // Also update localStorage
          saveMessages(serverMsgs);
        } else {
          const saved = loadMessages();
          if (saved.length === 0) {
            setMessages([{ role: 'assistant', content: "Hi! I'm your assistant. Ask me anything about your project!" }]);
          } else {
            setMessages(saved);
          }
        }
        setInitialised(true);
      })();
    }
  }, [initialised]);

  useEffect(() => {
    if (initialised) {
      saveMessages(messages);
      syncToServer(messages);
    }
  }, [messages, initialised]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatEndRef]);

  const clearHistory = useCallback(() => {
    setMessages([{ role: 'assistant', content: "Hi! I'm your assistant. Ask me anything about your project!" }]);
    saveMessages([]);
    clearOnServer();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!res.ok) throw new Error('Failed');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: reply };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{ chatOpen, setChatOpen, messages, sendMessage, loading, input, setInput, chatEndRef, clearHistory }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);

function renderMarkdown(text: string): string {
  if (!text) return '';
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br />');
  return sanitizeHtml(html);
}

export { renderMarkdown };
export type { ChatMsg };
