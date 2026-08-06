import { Router } from "express";
import { addChannel, addMessage, getChannels, getMessages } from "@workspace/db";
import { verifyToken } from "./auth.js";
import { wssBroadcast } from "../lib/ws.js";

const router = Router();

interface Channel { id: string; name: string; description: string; }
interface Message { id: string; channelId: string; userId?: string; userName: string; userEmail: string; role: "student" | "mentor"; content: string; timestamp: string; }

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", description: "General discussion for all students" },
  { id: "hardware", name: "hardware", description: "Arduino, Raspberry Pi, and hardware projects" },
  { id: "research", name: "research", description: "Research papers and academic writing" },
  { id: "announcements", name: "announcements", description: "Important announcements from mentors" },
];

async function getHubData(): Promise<{ channels: Channel[]; messages: Message[] }> {
  const [channels, messages] = await Promise.all([getChannels(), getMessages()]);
  if (channels.length === 0) {
    for (const c of DEFAULT_CHANNELS) await addChannel(c);
    return { channels: DEFAULT_CHANNELS, messages: [] };
  }
  return {
    channels,
    messages: messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId ?? undefined,
      userName: m.userName,
      userEmail: m.userEmail,
      role: m.role as "student" | "mentor",
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    })),
  };
}

function getUserFromReq(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return null;
  return { id: decoded.id, name: decoded.name || "", email: decoded.email || "" };
}

router.get("/hub", async (req, res) => {
  try { return res.json(await getHubData()); }
  catch (e) { return res.status(500).json({ error: "Failed to read hub data" }); }
});

router.put("/hub", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string") return res.status(400).json({ error: "Channel name required" });
    const clean = name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!clean) return res.status(400).json({ error: "Invalid channel name" });
    const data = await getHubData();
    if (data.channels.some((c) => c.id === clean)) return res.status(409).json({ error: "Channel already exists" });
    const newChannel: Channel = { id: clean, name: clean, description: description || "" };
    await addChannel(newChannel);
    wssBroadcast(JSON.stringify({ type: "channel_created", channel: newChannel }));
    return res.json(newChannel);
  } catch (e) { return res.status(500).json({ error: "Failed to create channel" }); }
});

router.post("/hub", async (req, res) => {
  try {
    const user = getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const { channelId, content } = req.body;
    if (!channelId || !content?.trim()) return res.status(400).json({ error: "Channel and content required" });
    const lowerEmail = user.email.toLowerCase();
    const role: "student" | "mentor" = (lowerEmail.endsWith("@mentors.eg") || lowerEmail.includes("mentor") || lowerEmail.includes("teacher")) ? "mentor" : "student";
    const newMessage: Message = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      channelId, userId: user.id, userName: user.name, userEmail: user.email, role,
      content: content.trim(), timestamp: new Date().toISOString(),
    };
    await addMessage({
      id: newMessage.id,
      channelId: newMessage.channelId,
      userId: newMessage.userId,
      userName: newMessage.userName,
      userEmail: newMessage.userEmail,
      role: newMessage.role,
      content: newMessage.content,
      timestamp: new Date(newMessage.timestamp),
    });
    wssBroadcast(JSON.stringify({ type: "new_message", message: newMessage }));
    return res.json(newMessage);
  } catch (e) { return res.status(500).json({ error: "Failed to post message" }); }
});

export default router;