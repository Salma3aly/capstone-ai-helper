import { pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type"),
  grade: text("grade"),
  phone: text("phone"),
  organization: text("organization"),
  avatar: text("avatar"),
  createdAt: text("created_at").notNull(),
});
