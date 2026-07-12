"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Hash, Send, Plus, Users, UserCheck, BookOpen, MessageSquare, ExternalLink, X } from "lucide-react";

interface Message {
  id: string;
  channelId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  role: "student" | "mentor";
  content: string;
  timestamp: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
}

interface OnlineUser {
  name: string;
  title: string;
  online: boolean;
}

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", description: "General capstone discussions" },
  { id: "electronics-help", name: "electronics-help", description: "Troubleshoot sensors, wiring & code" },
  { id: "isef-prep", name: "isef-prep", description: "Science fair & competition prep" },
  { id: "academic-writing", name: "academic-writing", description: "Citations, abstracts & papers" },
];

export default function HubPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadHubData = async (silent = false) => {
    try {
      const res = await fetch("/api/hub");
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      if (data.channels?.length) setChannels(data.channels);
      setMessages(data.messages || []);
    } catch {
      if (!silent) setError("Could not connect to the community server.");
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket("ws://localhost:3002");
        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: "join", userName: user?.name || "Anonymous", userEmail: user?.email || "" }));
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_message") {
              setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
            } else if (data.type === "channel_created") {
              loadHubData(true);
            } else if (data.type === "presence") {
              setOnlineUsers(data.users || []);
            }
          } catch {}
        };
        ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000); };
        ws.onerror = () => { ws?.close(); };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    const interval = setInterval(() => loadHubData(true), 15000);
    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const filteredMessages = messages.filter((m) => m.channelId === activeChannelId);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    const text = inputText;
    setInputText("");
    setLoading(true);
    try {
      const token = localStorage.getItem("capstone_token");
      const res = await fetch("/api/hub", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ channelId: activeChannelId, content: text }),
      });
      if (!res.ok) throw new Error("Could not post message");
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setError("Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    const name = prompt("Channel name (lowercase, no spaces):");
    if (!name) return;
    const clean = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!clean) { alert("Invalid name."); return; }
    const desc = prompt("Description:") || "";
    setCreating(true);
    try {
      const res = await fetch("/api/hub", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean, description: desc }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Failed"); return; }
      await loadHubData();
    } catch { alert("Failed to create channel."); }
    finally { setCreating(false); }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (sameDay) return time;
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
    } catch { return ""; }
  };

  const renderContent = (content: string) => {
    if (content.includes("```")) {
      const parts = content.split("```");
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          const lines = part.split("\n");
          const lang = lines[0]?.trim();
          const code = lines.slice(1).join("\n");
          return (
            <pre key={i} className="bg-[#0f172a] text-emerald-400 p-3 rounded-lg text-xs font-mono my-2 overflow-x-auto">
              {lang && <div className="text-gray-500 border-b border-gray-800 pb-1 mb-1 uppercase text-[10px]">{lang}</div>}
              <code>{code || part}</code>
            </pre>
          );
        }
        return <span key={i} className="whitespace-pre-wrap">{renderInline(part)}</span>;
      });
    }
    return <span className="whitespace-pre-wrap">{renderInline(content)}</span>;
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) return <span key={i} className="text-[#ec4899] bg-pink-50 px-1 rounded font-medium">{part}</span>;
      return part;
    });
  };

  const activeUser = activeChannelId === "general"
    ? onlineUsers
    : onlineUsers.filter((u) => u.online);

  return (
    <div className="flex h-[calc(100vh-57px)] bg-[#f8fafc] overflow-hidden">
      {/* Left sidebar */}
      <div className="w-56 bg-white border-r border-[#e2e8f0] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ec4899]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#ec4899]" />
            </div>
            <span className="font-bold text-sm text-[#0f172a]">Community</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider">Channels</span>
              <button onClick={createChannel} disabled={creating}
                className="w-5 h-5 rounded flex items-center justify-center text-[#94a3b8] hover:text-[#ec4899] hover:bg-[#fdf2f8] transition disabled:opacity-40"
              ><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-0.5">
              {channels.map((chan) => (
                <button key={chan.id} onClick={() => setActiveChannelId(chan.id)}
                  className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition font-medium ${
                    activeChannelId === chan.id
                      ? "bg-[#fdf2f8] text-[#ec4899] shadow-sm"
                      : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{chan.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block mb-2">Online</span>
            <div className="space-y-1.5">
              {activeUser.length === 0 ? (
                <p className="text-[10px] text-[#94a3b8] italic px-1">No one else is online</p>
              ) : (
                activeUser.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 px-1 py-1">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[11px] text-[#475569] truncate">{u.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {user && (
          <div className="p-3 border-t border-[#e2e8f0] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#a855f7] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {user.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-[#0f172a] truncate">{user.name || "Student"}</div>
              <div className="text-[10px] text-[#64748b] truncate">{user.email}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e2e8f0] bg-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-[#ec4899]" />
              {activeChannel.name}
            </h3>
            <p className="text-[11px] text-[#64748b] mt-0.5">{activeChannel.description}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs text-center">{error}</div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#fdf2f8] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#ec4899]" />
                </div>
                <h4 className="font-bold text-sm text-[#0f172a]">Welcome to #{activeChannel.name}</h4>
                <p className="text-xs text-[#64748b] max-w-sm mt-1">
                  Start the conversation — ask a question or share what you're building!
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const initials = msg.userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const isMentor = msg.role === "mentor";
              const isOwn = user?.email === msg.userEmail;
              return (
                <div key={msg.id} className="flex items-start gap-3 group">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 ${
                    isMentor
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                      : "bg-gradient-to-br from-[#ec4899] to-[#a855f7]"
                  }`}>
                    {initials || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`font-bold text-xs ${isOwn ? "text-[#ec4899]" : "text-[#0f172a]"}`}>
                        {msg.userName}
                        {isOwn && <span className="font-normal text-[10px] text-[#94a3b8] ml-1">(you)</span>}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isMentor ? "bg-blue-50 text-blue-600" : "bg-[#fdf2f8] text-[#ec4899]"
                      }`}>
                        {isMentor ? "Mentor" : "Student"}
                      </span>
                      <span className="text-[10px] text-[#94a3b8]">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-xs text-[#334155] mt-1 leading-relaxed break-words">
                      {renderContent(msg.content)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {user ? (
          <form onSubmit={sendMessage} className="p-3 border-t border-[#e2e8f0] bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                placeholder={`Message #${activeChannel.name}...`}
                className="flex-1 px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-xs text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#ec4899] focus:border-transparent transition bg-[#f8fafc] placeholder:text-[#94a3b8]"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !inputText.trim()}
                className="px-3 py-2.5 bg-[#ec4899] text-white rounded-lg hover:bg-[#db2777] transition disabled:opacity-40 disabled:cursor-not-allowed"
              ><Send className="w-4 h-4" /></button>
            </div>
          </form>
        ) : (
          <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc] text-center text-xs text-[#64748b]">
            Sign in to join the conversation.
          </div>
        )}
      </div>

      {/* Right sidebar */}
      {showSidebar && (
      <div className="w-64 border-l border-[#e2e8f0] bg-white p-4 space-y-5 hidden lg:flex flex-col overflow-y-auto shrink-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-[#ec4899]" />
              Egypt STEM Rules
            </h4>
            <button onClick={() => setShowSidebar(false)}
              className="w-5 h-5 rounded flex items-center justify-center text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] transition"
            ><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-2.5">
            <p className="text-[10px] text-[#64748b] leading-normal">
              Egypt STEM capstone projects are evaluated on engineering merit, journal quality, and academic honesty.
            </p>
            <hr className="border-[#e2e8f0]" />
            <ul className="text-[10px] text-[#475569] space-y-2">
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 shrink-0 mt-0.5">•</span>
                <span><strong className="text-[#0f172a]">No Plagiarism:</strong> Cite all sources in APA/IEEE format.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 shrink-0 mt-0.5">•</span>
                <span><strong className="text-[#0f172a]">Data Integrity:</strong> Do not fabricate sensor logs.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 shrink-0 mt-0.5">•</span>
                <span><strong className="text-[#0f172a]">Market Sourcing:</strong> Bab El-Louk is standard for hardware.</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5 uppercase tracking-wider mb-3">
            <ExternalLink className="w-4 h-4 text-amber-500" />
            Tips
          </h4>
          <div className="text-[10px] text-[#64748b] space-y-2 leading-relaxed">
            <p>Wrap code in <code className="font-mono bg-[#f1f5f9] px-1 rounded text-[#ec4899]">```</code> for syntax highlighting.</p>
            <p>Tag someone with <code className="font-mono bg-[#f1f5f9] px-1 rounded text-[#ec4899]">@username</code> to get their attention.</p>
            <p>Mentors are volunteers — share full circuit details when asking for help.</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}