import { Schema, model, models } from "mongoose";

export interface IResearchPaper {
  id: string;
  userId: string;
  title: string;
  originalText: string;
  summary: any;
  projectContext?: string;
  createdAt: string;
}

const ResearchPaperSchema = new Schema<IResearchPaper>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "" },
  originalText: { type: String, default: "" },
  summary: { type: Schema.Types.Mixed },
  projectContext: { type: String },
  createdAt: { type: String, required: true },
});

export const ResearchPaperModel = models.ResearchPaper || model<IResearchPaper>("ResearchPaper", ResearchPaperSchema);
