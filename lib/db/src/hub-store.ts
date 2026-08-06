import { eq } from "drizzle-orm";
import type { HubChannel, HubMessage } from "./types";
import { getDb } from "./index";
import { hubChannels, hubMessages } from "./schema";

export async function getChannels(): Promise<HubChannel[]> {
  const db = getDb();
  const rows = await db.select().from(hubChannels).orderBy(hubChannels.name);
  return rows;
}

export async function getMessages(channelId?: string): Promise<HubMessage[]> {
  const db = getDb();
  const q = db.select().from(hubMessages).orderBy(hubMessages.timestamp);
  if (channelId) return q.where(eq(hubMessages.channelId, channelId));
  return q;
}

export async function addChannel(channel: HubChannel): Promise<void> {
  const db = getDb();
  await db.insert(hubChannels).values(channel).onConflictDoNothing();
}

export async function addMessage(message: HubMessage): Promise<void> {
  const db = getDb();
  await db.insert(hubMessages).values(message).onConflictDoNothing();
}