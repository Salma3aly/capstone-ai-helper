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

const ChatContext = createContext<ChatContextValue>({
  chatOpen: false,
  setChatOpen: () => {},
  messages: [],
  sendMessage: async () => {},
  loading: false,
  input: '',
  setInput: () => {},
  chatEndRef: { current: null },
  clearHistory: () => {},
});

const STORAGE_KEY = 'capstone_chat_history';
const SYSTEM_PROMPT = `You are Lipo, a helpful AI assistant for Capstone — a platform that helps students build projects using hardware prototyping, research assistance, and citation generation. Keep responses concise and encouraging. You help with: hardware/Arduino/Raspberry Pi projects, research paper summaries, citation formatting, and general capstone project guidance.`;

export function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-pink-600">$1</code>')
    .replace(/\n/g, '<br/>');
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch {}
    }
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text.trim() };
    const assistantMsg: ChatMsg = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    setInput('');

    try {
      const token = localStorage.getItem('capstone_token');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })), system: SYSTEM_PROMPT }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // SSE
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || '';
              if (delta) {
                full += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: sanitizeHtml(full) };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I hit an error. Please try again!' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  return (
    <ChatContext.Provider value={{ chatOpen, setChatOpen, messages, sendMessage, loading, input, setInput, chatEndRef, clearHistory }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
