import { Schema, model, models } from "mongoose";

export interface IHubChannel {
  id: string;
  name: string;
  description: string;
}

const HubChannelSchema = new Schema<IHubChannel>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
});

export const HubChannel = models.HubChannel || model<IHubChannel>("HubChannel", HubChannelSchema);
