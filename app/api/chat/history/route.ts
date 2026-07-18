import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { connectDB } from "@/lib/db/connect";
import { ChatSessionModel } from "@/lib/db/models/ChatSession";

interface ChatSession {
  id: string;
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  updatedAt: string;
  createdAt: string;
}

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await connectDB();
    const userSessions = await ChatSessionModel.find({ userId: user.id })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ sessions: userSessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    await connectDB();
    const now = new Date().toISOString();

    // Find existing session or create new one
    let session = await ChatSessionModel.findOne({ userId: user.id });
    if (session) {
      session.messages = messages;
      session.updatedAt = now;
      await session.save();
    } else {
      session = new ChatSessionModel({
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        messages,
        createdAt: now,
        updatedAt: now,
      });
      await session.save();
    }

    return NextResponse.json({ session: session.toObject() });
  } catch {
    return NextResponse.json({ error: "Failed to save chat history" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await connectDB();
    await ChatSessionModel.deleteMany({ userId: user.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}
