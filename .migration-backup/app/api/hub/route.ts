import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { verifyToken } from "@/lib/auth/db";

const WS_URL = "http://localhost:3002";
const DATA_FILE = path.join(process.cwd(), "data", "hub_messages.json");

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

interface HubData {
  channels: Channel[];
  messages: Message[];
}

async function notifyWs(endpoint: string, data: unknown) {
  try { await fetch(`${WS_URL}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }
  catch {}
}

async function getHubData(): Promise<HubData> {
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf-8")); }
  catch { return { channels: [], messages: [] }; }
}

async function saveHubData(data: HubData) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getUserFromRequest(req: Request): { id: string; name: string; email: string } | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return null;
  return { id: decoded.id, name: decoded.name || "", email: decoded.email || "" };
}

export async function GET() {
  try { return NextResponse.json(await getHubData()); }
  catch (e) { console.error("Hub GET error:", e); return NextResponse.json({ error: "Failed to read messages" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const { name, description } = await req.json();
    if (!name || typeof name !== "string") return NextResponse.json({ error: "Channel name required" }, { status: 400 });
    const clean = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!clean) return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });
    const data = await getHubData();
    if (data.channels.some((c) => c.id === clean)) return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
    const newChannel: Channel = { id: clean, name: clean, description: description || "" };
    data.channels.push(newChannel);
    await saveHubData(data);
    notifyWs("/notify-channel", newChannel);
    return NextResponse.json(newChannel);
  } catch (e) { console.error("Hub PUT error:", e); return NextResponse.json({ error: "Failed to create channel" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { channelId, content } = await req.json();
    if (!channelId || !content?.trim()) return NextResponse.json({ error: "Channel and content required" }, { status: 400 });

    const lowerEmail = user.email.toLowerCase();
    const role: "student" | "mentor" =
      lowerEmail.endsWith("@mentors.eg") || lowerEmail.includes("mentor") || lowerEmail.includes("teacher") || lowerEmail.includes("dr.")
        ? "mentor" : "student";

    const newMessage: Message = {
      id: "m_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      channelId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const data = await getHubData();
    data.messages.push(newMessage);
    await saveHubData(data);
    notifyWs("/notify", newMessage);
    return NextResponse.json(newMessage);
  } catch (e) { console.error("Hub POST error:", e); return NextResponse.json({ error: "Failed to post message" }, { status: 500 }); }
}
