import { Router } from "express";
import { readStore, writeStore } from "../lib/storage/db.js";
import { verifyToken } from "./auth.js";
import { wssBroadcast } from "../lib/ws.js";

const router = Router();

interface Channel { id: string; name: string; description: string; }
interface Message { id: string; channelId: string; userId?: string; userName: string; userEmail: string; role: "student" | "mentor"; content: string; timestamp: string; }
interface HubData { channels: Channel[]; messages: Message[]; }

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", description: "General discussion for all students" },
  { id: "hardware", name: "hardware", description: "Arduino, Raspberry Pi, and hardware projects" },
  { id: "research", name: "research", description: "Research papers and academic writing" },
  { id: "announcements", name: "announcements", description: "Important announcements from mentors" },
];

async function getHubData(): Promise<HubData> {
  try {
    const data = await readStore<HubData>("hub_data");
    const hub = data as unknown as HubData;
    if (!hub.channels || !Array.isArray(hub.channels)) return { channels: DEFAULT_CHANNELS, messages: [] };
    return hub;
  } catch { return { channels: DEFAULT_CHANNELS, messages: [] }; }
}

async function saveHubData(data: HubData) {
  await writeStore("hub_data", data);
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
    data.channels.push(newChannel);
    await saveHubData(data);
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
    const data = await getHubData();
    data.messages.push(newMessage);
    await saveHubData(data);
    wssBroadcast(JSON.stringify({ type: "new_message", message: newMessage }));
    return res.json(newMessage);
  } catch (e) { return res.status(500).json({ error: "Failed to post message" }); }
});

export default router;
