'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { SandboxProject, SandboxStage, IdeaAnalysis, ComponentRecommendation, WiringDiagram, CodeGeneration } from '@/lib/sandbox/types';

const STAGE_ORDER: SandboxStage[] = ['idea', 'analyzed', 'components', 'wiring', 'code'];

interface ProjectContextValue {
  project: SandboxProject | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  currentStage: SandboxStage;
  stageIndex: number;
  totalStages: number;
  stageOrder: SandboxStage[];
  isStageCompleted: (stage: SandboxStage) => boolean;
  isStageAccessible: (stage: SandboxStage) => boolean;
  goToStage: (stage: SandboxStage) => void;
  advanceStage: () => void;
  goBackStage: () => void;
  saveProject: () => Promise<void>;
  updateProject: (updates: Partial<SandboxProject>) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}

function getStageIndex(stage: SandboxStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const [project, setProject] = useState<SandboxProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const currentStage = project?.stage || 'idea';
  const stageIndex = getStageIndex(currentStage);
  const totalStages = STAGE_ORDER.length;
  const stageOrder = STAGE_ORDER;

  const isStageCompleted = useCallback((stage: SandboxStage) => {
    if (!project) return false;
    const idx = getStageIndex(stage);
    const currentIdx = getStageIndex(project.stage);
    return idx < currentIdx;
  }, [project]);

  const isStageAccessible = useCallback((stage: SandboxStage) => {
    if (!project) return stage === 'idea';
    const idx = getStageIndex(stage);
    const currentIdx = getStageIndex(project.stage);
    return idx <= currentIdx;
  }, [project]);

  const goToStage = useCallback((stage: SandboxStage) => {
    if (!isStageAccessible(stage)) return;
    const path = `/projects/${projectId}/${stage === 'idea' ? 'idea' : stage === 'analyzed' ? 'analysis' : stage === 'components' ? 'components' : stage === 'wiring' ? 'wiring' : 'code'}`;
    router.push(path);
  }, [projectId, router, isStageAccessible]);

  const goBackStage = useCallback(() => {
    if (stageIndex > 0) {
      goToStage(STAGE_ORDER[stageIndex - 1]);
    }
  }, [stageIndex, goToStage]);

  const advanceStage = useCallback(async () => {
    if (stageIndex < totalStages - 1 && project) {
      const nextStage = STAGE_ORDER[stageIndex + 1];
      setProject(prev => prev ? { ...prev, stage: nextStage } : null);
    }
  }, [stageIndex, totalStages, project]);

  const saveProject = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sandbox/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      setError('Failed to save project');
    } finally {
      setSaving(false);
    }
  }, [project]);

  const updateProject = useCallback((updates: Partial<SandboxProject>) => {
    setProject(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Load project
  useEffect(() => {
    if (!projectId || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetch(`/api/sandbox/projects/${projectId}`)
      .then(res => {
        if (!res.ok && res.status !== 404) throw new Error('Failed to load');
        return res.json().catch(() => null);
      })
      .then(data => {
        if (data) setProject(data);
        else setError('Project not found');
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{
      project, loading, saving, error,
      currentStage, stageIndex, totalStages, stageOrder,
      isStageCompleted, isStageAccessible,
      goToStage, advanceStage, goBackStage,
      saveProject, updateProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}