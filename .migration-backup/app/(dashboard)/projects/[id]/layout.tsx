'use client';
import { ProjectProvider } from '@/lib/context/ProjectContext';
import AppShell from '@/components/project/AppShell';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <AppShell>{children}</AppShell>
    </ProjectProvider>
  );
}
