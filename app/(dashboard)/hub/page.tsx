"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { Hash, Send, Plus, Users, UserCheck, ShieldAlert, BookOpen } from "lucide-react";

interface Message {
  id: string;
  channelId: string;
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

// Simulated active online users list
const MENTORS_LIST = [
  { name: "Dr. Ahmed Refaat", title: "Engineering & IoT Mentor", online: true },
  { name: "Eng. Sarah Mansour", title: "Software & Web Mentor", online: true },
  { name: "Dr. Laila Hegazi", title: "Chemistry & Bio-Tech Mentor", online: false },
];

export default function HubPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load channels and messages
  const loadHubData = async (silent = false) => {
    try {
      const res = await fetch("/api/hub");
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setChannels(data.channels || []);
      setMessages(data.messages || []);
    } catch (err) {
      if (!silent) setError("Could not connect to the community server.");
    }
  };

  // Initial load
  useEffect(() => {
    loadHubData();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket("ws://localhost:3002");
        ws.onopen = () => console.log("WS connected");
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_message") {
              setMessages((prev) => [...prev, data.message]);
            } else if (data.type === "channel_created") {
              loadHubData(true);
            }
          } catch {}
        };
        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    // Fallback polling every 10 seconds in case WebSocket fails
    const interval = setInterval(() => loadHubData(true), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // Scroll to bottom when messages or active channel changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || {
    name: "general",
    description: "General discussions",
  };

  const filteredMessages = messages.filter((m) => m.channelId === activeChannelId);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText;
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannelId,
          userName: user.name || "Anonymous Student",
          userEmail: user.email || "student@stem.edu.eg",
          content: text,
        }),
      });

      if (!res.ok) throw new Error("Could not post message");
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [creatingChannel, setCreatingChannel] = useState(false);
  const createChannel = async () => {
    const name = prompt("Enter new channel name (lowercase, no spaces):");
    if (!name) return;
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!cleanName) {
      alert("Invalid channel name.");
      return;
    }
    const description = prompt("Enter channel description:") || "No description provided.";
    setCreatingChannel(true);
    try {
      const res = await fetch("/api/hub", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create channel");
        return;
      }
      await loadHubData();
    } catch {
      alert("Could not create channel. Please try again.");
    } finally {
      setCreatingChannel(false);
    }
  };

  // Helper to format timestamps nicely (e.g. 10:15 AM)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Simple formatter to detect links, @mentions, and format code snippets
  const renderMessageContent = (content: string) => {
    // Detect code blocks
    if (content.includes("```")) {
      const parts = content.split("```");
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // Inside code block
          const lines = part.split("\n");
          const lang = lines[0]?.trim();
          const code = lines.slice(1).join("\n");
          return (
            <pre key={index} className="bg-gray-900 text-emerald-400 p-3 rounded-lg text-xs font-mono my-2 overflow-x-auto border border-gray-800">
              {lang && <div className="text-gray-500 border-b border-gray-800 pb-1 mb-1 uppercase text-[10px]">{lang}</div>}
              <code>{code || part}</code>
            </pre>
          );
        }
        return <span key={index} className="whitespace-pre-wrap">{renderInline(part)}</span>;
      });
    }

    return <span className="whitespace-pre-wrap">{renderInline(content)}</span>;
  };

  const renderInline = (text: string) => {
    // Replace @mentions with highlighted spans
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        return <span key={i} className="text-[#ec4899] bg-pink-50 px-1 rounded font-medium">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      {/* 1. LEFT PANE: Channels & Active Users */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#ec4899]" />
            <span className="font-bold text-sm text-white tracking-wide">Community Hub</span>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Channels</span>
              <button onClick={createChannel} disabled={creatingChannel} className="text-slate-400 hover:text-white transition disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {channels.map((chan) => (
                <button
                  key={chan.id}
                  onClick={() => setActiveChannelId(chan.id)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition font-medium ${
                    activeChannelId === chan.id
                      ? "bg-[#ec4899] text-white shadow-sm"
                      : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{chan.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mentors Panel */}
          <div>
            <div className="px-2 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified Mentors</span>
            </div>
            <div className="space-y-2 px-2">
              {MENTORS_LIST.map((mentor) => (
                <div key={mentor.name} className="flex items-start gap-2 text-[11px] leading-tight">
                  <div className="relative mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    {mentor.online && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 absolute top-0 left-0 animate-ping" />
                    )}
                    {mentor.online && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 absolute top-0 left-0" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-1">
                      {mentor.name}
                      <UserCheck className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="text-[9px] text-slate-500">{mentor.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logged in User Bar */}
        {user && (
          <div className="p-3 bg-slate-950 border-t border-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#db2777] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "S"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-slate-200 truncate">{user.name || "Student"}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. MIDDLE PANE: Main Chat area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-[#ec4899]" />
              {activeChannel.name}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{activeChannel.description}</p>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs text-center">
              {error}
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <span className="text-3xl">👋</span>
                <h4 className="font-bold text-gray-700 text-sm mt-2">Welcome to #{activeChannel.name}</h4>
                <p className="text-xs text-gray-400 max-w-sm mt-1">Be the first to ask a question or introduce your Capstone project concept here!</p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMentor = msg.role === "mentor";
              const initials = msg.userName.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return (
                <div key={msg.id} className="flex items-start gap-3 group animate-in fade-in duration-200">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 uppercase ${
                    isMentor ? "bg-gradient-to-tr from-blue-600 to-indigo-500" : "bg-gradient-to-tr from-[#ec4899] to-purple-500"
                  }`}>
                    {initials || "S"}
                  </div>
                  {/* Message Box */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-xs text-gray-800 hover:underline cursor-pointer">{msg.userName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isMentor ? "bg-blue-100 text-blue-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {msg.role}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-xs text-gray-700 mt-1 leading-relaxed break-words">
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-gray-55 shrink-0">
          <div className="relative border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-[#ec4899] bg-white">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={`Message #${activeChannel.name}... (Press Enter to send, Shift+Enter for new line)`}
              className="w-full resize-none bg-transparent outline-none p-3 pb-12 text-xs text-gray-800 max-h-32 min-h-[64px]"
              disabled={loading}
            />
            <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="bg-[#ec4899] text-white p-1.5 rounded-lg hover:bg-[#db2777] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. RIGHT PANE: Channel Info & Egypt STEM Rules */}
      <div className="w-64 bg-gray-55 border-l border-gray-200 p-4 space-y-6 hidden lg:flex flex-col overflow-y-auto shrink-0">
        <div>
          <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Egypt STEM Rules
          </h4>
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <p className="text-[10px] text-gray-500 leading-normal">
              Egypt STEM Graduation Capstone projects are strictly evaluated on engineering merit, journal writing quality, and absolute academic honesty.
            </p>
            <hr className="border-gray-100" />
            <ul className="text-[9px] text-gray-600 space-y-2">
              <li className="flex items-start gap-1">
                <span className="text-red-500 shrink-0 font-bold">•</span>
                <span><strong>No Plagiarism:</strong> Cite all scientific journals and previous work using APA/IEEE format.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-red-500 shrink-0 font-bold">•</span>
                <span><strong>Data Integrity:</strong> Do not fabricate logs or sensor readouts. The jury verifies all dynamic graphs.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-red-500 shrink-0 font-bold">•</span>
                <span><strong>Market Sourcing:</strong> Bab El-Louk and local Cairo markets are standard for hardware procurement.</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Engagement Tips
          </h4>
          <div className="text-[10px] text-gray-500 space-y-2 leading-relaxed">
            <p>1. When posting code, wrap it in three backticks <code className="font-mono bg-gray-150 p-0.5 rounded">```cpp</code> for proper formatting.</p>
            <p>2. Mentors are volunteers. Please provide full circuit schemas and ideas when asking details.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
