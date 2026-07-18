import { Schema, model, models } from "mongoose";

export interface ISandboxProject {
  id: string;
  userId: string;
  title: string;
  rawIdea: string;
  stage: string;
  analysis?: any;
  components?: any;
  wiring?: any;
  code?: any;
  createdAt: number;
  updatedAt: number;
  hardwareBoard?: string;
  hardwareSensors?: string[];
  sensorNames?: Record<string, string>;
  hardwareWiring?: any[];
  hardwareRecommendation?: any;
}

const SandboxProjectSchema = new Schema<ISandboxProject>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "" },
  rawIdea: { type: String, default: "" },
  stage: { type: String, default: "idea" },
  analysis: { type: Schema.Types.Mixed },
  components: { type: Schema.Types.Mixed },
  wiring: { type: Schema.Types.Mixed },
  code: { type: Schema.Types.Mixed },
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  hardwareBoard: { type: String },
  hardwareSensors: [{ type: String }],
  sensorNames: { type: Schema.Types.Mixed },
  hardwareWiring: [{ type: Schema.Types.Mixed }],
  hardwareRecommendation: { type: Schema.Types.Mixed },
});

export const SandboxProjectModel = models.SandboxProject || model<ISandboxProject>("SandboxProject", SandboxProjectSchema);
