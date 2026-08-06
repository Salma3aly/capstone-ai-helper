import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const hubChannels = pgTable("hub_channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
});

export const hubMessages = pgTable("hub_messages", {
  id: text("id").primaryKey(),
  channelId: text("channel_id")
    .notNull()
    .references(() => hubChannels.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});
