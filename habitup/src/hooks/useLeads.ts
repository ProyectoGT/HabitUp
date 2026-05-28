import { useState, useCallback } from 'react';
import { leadsService, CreateLeadParams } from '@/services/leads.service';
import type { Lead } from '@/types/models';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsService.getMyLeads();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsService.getAvailableForProfessional();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLead = useCallback(async (params: CreateLeadParams): Promise<Lead | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const lead = await leadsService.create(params);
      setLeads((prev) => [lead, ...prev]);
      return lead;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear solicitud');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelLead = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await leadsService.cancel(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cancelar solicitud');
      return false;
    }
  }, []);

  return {
    leads,
    isLoading,
    error,
    fetchMyLeads,
    fetchAvailableLeads,
    createLead,
    cancelLead,
  };
}

export function useLeadById(id: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsService.getById(id);
      setLead(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitud');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { lead, isLoading, error, fetch };
}
