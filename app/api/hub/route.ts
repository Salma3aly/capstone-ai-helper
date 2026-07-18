import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { HubMessage } from "@/lib/db/models/HubMessage";
import { HubChannel } from "@/lib/db/models/HubChannel";
import { getPusherServer } from "@/lib/pusher/server";
import { verifyToken } from "@/lib/auth/db";

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

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", description: "General capstone discussions" },
  { id: "electronics-help", name: "electronics-help", description: "Troubleshoot sensors, wiring & code" },
  { id: "isef-prep", name: "isef-prep", description: "Science fair & competition prep" },
  { id: "academic-writing", name: "academic-writing", description: "Citations, abstracts & papers" },
];

function getUserFromRequest(req: Request): { id: string; name: string; email: string } | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return null;
  return { id: decoded.id, name: decoded.name || "", email: decoded.email || "" };
}

export async function GET() {
  try {
    await connectDB();

    const dbChannels = await HubChannel.find().lean();
    let channels: Channel[];
    if (dbChannels.length === 0) {
      await HubChannel.insertMany(DEFAULT_CHANNELS);
      channels = DEFAULT_CHANNELS;
    } else {
      channels = dbChannels.map((c: any) => ({ id: c.id, name: c.name, description: c.description }));
    }

    const dbMessages = await HubMessage.find().sort({ timestamp: 1 }).lean();
    const messages: Message[] = dbMessages.map((m: any) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      userName: m.userName,
      userEmail: m.userEmail,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    return NextResponse.json({ channels, messages });
  } catch (e) {
    console.error("Hub GET error:", e);
    return NextResponse.json({ error: "Failed to read messages" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { name, description } = await req.json();
    if (!name || typeof name !== "string")
      return NextResponse.json({ error: "Channel name required" }, { status: 400 });
    const clean = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!clean)
      return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });

    await connectDB();
    const existing = await HubChannel.findOne({ id: clean });
    if (existing)
      return NextResponse.json({ error: "Channel already exists" }, { status: 409 });

    const newChannel: Channel = { id: clean, name: clean, description: description || "" };
    await HubChannel.create(newChannel);

    try {
      await getPusherServer().trigger("hub-global", "channel-created", newChannel);
    } catch {}

    return NextResponse.json(newChannel);
  } catch (e) {
    console.error("Hub PUT error:", e);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { channelId, content } = await req.json();
    if (!channelId || !content?.trim())
      return NextResponse.json({ error: "Channel and content required" }, { status: 400 });

    const lowerEmail = user.email.toLowerCase();
    const role: "student" | "mentor" =
      lowerEmail.endsWith("@mentors.eg") ||
      lowerEmail.includes("mentor") ||
      lowerEmail.includes("teacher") ||
      lowerEmail.includes("dr.")
        ? "mentor"
        : "student";

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

    await connectDB();
    await HubMessage.create(newMessage);

    try {
      await getPusherServer().trigger(`hub-${channelId}`, "new-message", newMessage);
    } catch {}

    return NextResponse.json(newMessage);
  } catch (e) {
    console.error("Hub POST error:", e);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
