import { Schema, model, models } from "mongoose";

export interface ILegacyProject {
  id: string;
  userId: string;
  idea: string;
  board: string;
  boardId: string | null;
  sensors: string[];
  sensorNames: Record<string, string>;
  wiring: any[];
  code: string;
  language: string;
  createdAt: number;
  updatedAt: number;
  status: string;
}

const LegacyProjectSchema = new Schema<ILegacyProject>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  idea: { type: String, default: "" },
  board: { type: String, default: "" },
  boardId: { type: String, default: null },
  sensors: [{ type: String }],
  sensorNames: { type: Schema.Types.Mixed },
  wiring: [{ type: Schema.Types.Mixed }],
  code: { type: String, default: "" },
  language: { type: String, default: "" },
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  status: { type: String, default: "idea" },
});

export const LegacyProjectModel = models.LegacyProject || model<ILegacyProject>("LegacyProject", LegacyProjectSchema);
