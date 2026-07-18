import { Schema, model, models } from "mongoose";

export interface IChatSession {
  id: string;
  userId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  createdAt: string;
  updatedAt: string;
}

const ChatMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  messages: { type: [ChatMessageSchema], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

export const ChatSessionModel = models.ChatSession || model<IChatSession>("ChatSession", ChatSessionSchema);
