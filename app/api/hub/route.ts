import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const WS_URL = "http://localhost:3002";

async function notifyWs(endpoint: string, data: unknown) {
  try {
    await fetch(`${WS_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // WS server might not be running
  }
}

const DATA_FILE = path.join(process.cwd(), "data", "hub_messages.json");

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

interface HubData {
  channels: Channel[];
  messages: Message[];
}

async function getHubData(): Promise<HubData> {
  try {
    const fileContent = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading hub messages file, using fallback:", error);
    return { channels: [], messages: [] };
  }
}

async function saveHubData(data: HubData): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: Request) {
  try {
    const data = await getHubData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Hub API GET Error:", error);
    return NextResponse.json({ error: "Failed to read messages" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { name, description } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!cleanName) {
      return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });
    }
    const data = await getHubData();
    if (data.channels.some((c) => c.id === cleanName)) {
      return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
    }
    const newChannel: Channel = {
      id: cleanName,
      name: cleanName,
      description: description || "No description provided",
    };
    data.channels.push(newChannel);
    await saveHubData(data);
    notifyWs("/notify-channel", { id: cleanName, name: cleanName, description: newChannel.description });
    return NextResponse.json(newChannel);
  } catch (error) {
    console.error("Hub API PUT Error:", error);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channelId, userName, userEmail, content } = body;

    if (!channelId || !userName || !userEmail || !content || !content.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const data = await getHubData();

    // Determine role: emails ending in mentors.eg or containing mentor are mentors, else student.
    const lowerEmail = userEmail.toLowerCase();
    const role: "student" | "mentor" =
      lowerEmail.endsWith("@mentors.eg") || lowerEmail.includes("mentor") || lowerEmail.includes("teacher") || lowerEmail.includes("dr.")
        ? "mentor"
        : "student";

    const newMessage: Message = {
      id: "m_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      channelId,
      userName,
      userEmail,
      role,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    data.messages.push(newMessage);
    await saveHubData(data);

    notifyWs("/notify", newMessage);

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Hub API POST Error:", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
