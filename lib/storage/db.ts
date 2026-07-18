import { connectDB } from "@/lib/db/connect";
import { SandboxProjectModel, ISandboxProject } from "@/lib/db/models/SandboxProject";
import { ResearchPaperModel, IResearchPaper } from "@/lib/db/models/ResearchPaper";
import { LegacyProjectModel, ILegacyProject } from "@/lib/db/models/LegacyProject";
import { ChatSessionModel, IChatSession } from "@/lib/db/models/ChatSession";

type CollectionName = "sandbox_projects" | "research_papers" | "projects" | "chat_history";

export async function readStore<T>(name: CollectionName): Promise<T> {
  await connectDB();
  switch (name) {
    case "sandbox_projects": {
      const docs = await SandboxProjectModel.find().lean();
      return docs as unknown as T;
    }
    case "research_papers": {
      const docs = await ResearchPaperModel.find().lean();
      return docs as unknown as T;
    }
    case "projects": {
      const docs = await LegacyProjectModel.find().lean();
      return docs as unknown as T;
    }
    case "chat_history": {
      const docs = await ChatSessionModel.find().lean();
      return docs as unknown as T;
    }
    default:
      return [] as unknown as T;
  }
}

export async function writeStore(name: CollectionName, data: unknown): Promise<void> {
  await connectDB();
  switch (name) {
    case "sandbox_projects": {
      await SandboxProjectModel.deleteMany({});
      if (Array.isArray(data)) {
        await SandboxProjectModel.insertMany(data as ISandboxProject[]);
      }
      break;
    }
    case "research_papers": {
      await ResearchPaperModel.deleteMany({});
      if (Array.isArray(data)) {
        await ResearchPaperModel.insertMany(data as IResearchPaper[]);
      }
      break;
    }
    case "projects": {
      await LegacyProjectModel.deleteMany({});
      if (Array.isArray(data)) {
        await LegacyProjectModel.insertMany(data as ILegacyProject[]);
      }
      break;
    }
    case "chat_history": {
      await ChatSessionModel.deleteMany({});
      if (Array.isArray(data)) {
        await ChatSessionModel.insertMany(data as IChatSession[]);
      }
      break;
    }
  }
}
