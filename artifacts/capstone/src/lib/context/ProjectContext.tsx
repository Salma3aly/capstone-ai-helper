import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useParams, useLocation } from 'wouter';
import type { SandboxProject, SandboxStage, IdeaAnalysis, ComponentRecommendation, WiringDiagram, CodeGeneration } from '@/lib/sandbox/types';

const STAGE_ORDER: SandboxStage[] = ['idea', 'analyzed', 'components', 'wiring', 'code'];

interface ProjectContextValue {
  project: SandboxProject | null;
  loading: boolean;
  error: string | null;
  analysisDraft: IdeaAnalysis | null;
  componentsDraft: ComponentRecommendation | null;
  wiringDraft: WiringDiagram | null;
  codeDraft: CodeGeneration | null;
  setProject: (p: SandboxProject) => void;
  setAnalysisDraft: (d: IdeaAnalysis | null) => void;
  setComponentsDraft: (d: ComponentRecommendation | null) => void;
  setWiringDraft: (d: WiringDiagram | null) => void;
  setCodeDraft: (d: CodeGeneration | null) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  project: null, loading: true, error: null,
  analysisDraft: null, componentsDraft: null, wiringDraft: null, codeDraft: null,
  setProject: () => {}, setAnalysisDraft: () => {}, setComponentsDraft: () => {},
  setWiringDraft: () => {}, setCodeDraft: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [project, setProjectState] = useState<SandboxProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisDraft, setAnalysisDraft] = useState<IdeaAnalysis | null>(null);
  const [componentsDraft, setComponentsDraft] = useState<ComponentRecommendation | null>(null);
  const [wiringDraft, setWiringDraft] = useState<WiringDiagram | null>(null);
  const [codeDraft, setCodeDraft] = useState<CodeGeneration | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const token = localStorage.getItem('capstone_token');
    fetch(`/api/sandbox/projects/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProjectState(d.project);
        setAnalysisDraft(d.project.analysis);
        setComponentsDraft(d.project.components);
        setWiringDraft(d.project.wiring);
        setCodeDraft(d.project.code);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const setProject = useCallback((p: SandboxProject) => setProjectState(p), []);

  return (
    <ProjectContext.Provider value={{ project, loading, error, analysisDraft, componentsDraft, wiringDraft, codeDraft, setProject, setAnalysisDraft, setComponentsDraft, setWiringDraft, setCodeDraft }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
