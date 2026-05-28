import { useState, useCallback } from 'react';
import { projectsService } from '@/services/projects.service';
import type { Project, ProjectWithDetails, ProjectStatus } from '@/types/models';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsService.getMyProjects();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar proyectos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: ProjectStatus): Promise<boolean> => {
    setError(null);
    try {
      await projectsService.updateStatus(id, status);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar estado');
      return false;
    }
  }, []);

  const requestCompletion = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await projectsService.requestCompletion(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al solicitar finalización');
      return false;
    }
  }, []);

  const completeProject = useCallback(async (id: string): Promise<Project | null> => {
    setError(null);
    try {
      return await projectsService.completeProject(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al completar proyecto');
      return null;
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    fetchMyProjects,
    updateStatus,
    requestCompletion,
    completeProject,
  };
}

export function useProjectById(id: string) {
  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsService.getById(id);
      setProject(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar proyecto');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { project, isLoading, error, fetch };
}
