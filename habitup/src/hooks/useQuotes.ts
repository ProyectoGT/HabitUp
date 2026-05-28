import { useState, useCallback } from 'react';
import { quotesService, CreateQuoteParams } from '@/services/quotes.service';
import type { Quote, Project } from '@/types/models';

export function useQuotes(leadId?: string) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForLead = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await quotesService.getQuotesForLead(id);
      setQuotes(data as Quote[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar presupuestos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await quotesService.getMyQuotes();
      setQuotes(data as Quote[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar presupuestos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createQuote = useCallback(async (params: CreateQuoteParams): Promise<Quote | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const quote = await quotesService.create(params);
      setQuotes((prev) => [quote, ...prev]);
      return quote;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar presupuesto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptQuote = useCallback(async (quoteId: string): Promise<Project | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await quotesService.accept(quoteId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aceptar presupuesto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectQuote = useCallback(async (quoteId: string, reason?: string): Promise<boolean> => {
    setError(null);
    try {
      await quotesService.reject(quoteId, reason);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al rechazar presupuesto');
      return false;
    }
  }, []);

  return {
    quotes,
    isLoading,
    error,
    fetchForLead,
    fetchMyQuotes,
    createQuote,
    acceptQuote,
    rejectQuote,
  };
}
