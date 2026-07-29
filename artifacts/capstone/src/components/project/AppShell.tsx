'use client';
import { useProject } from '@/lib/context/ProjectContext';
import ProjectHeader from './ProjectHeader';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { project, loading, error } = useProject();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#ec4899]" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm text-[#64748b]">{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ProjectHeader />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
