import { Schema, model, models } from "mongoose";

export interface IHubMessage {
  id: string;
  channelId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  role: "student" | "mentor";
  content: string;
  timestamp: string;
}

const HubMessageSchema = new Schema<IHubMessage>({
  id: { type: String, required: true, unique: true },
  channelId: { type: String, required: true, index: true },
  userId: { type: String },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  role: { type: String, enum: ["student", "mentor"], required: true },
  content: { type: String, required: true },
  timestamp: { type: String, required: true },
});

export const HubMessage = models.HubMessage || model<IHubMessage>("HubMessage", HubMessageSchema);
