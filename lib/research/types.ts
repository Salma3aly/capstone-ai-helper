export interface ResearchSummary {
  overview?: string;
  abstractText?: string;
  objective: string;
  methodology: string;
  findings: string;
  capstoneJustification?: string;
  apaCitation?: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  originalText: string;
  summary: ResearchSummary;
  projectContext?: string;
  createdAt: string;
}

export const MAX_RESEARCH_CHARS = 15000;
