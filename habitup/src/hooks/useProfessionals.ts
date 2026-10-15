import { useState, useCallback, useRef } from 'react';
import { professionalsService, type SearchProfessionalsParams } from '@/services/professionals.service';
import type { ProfessionalCardData } from '@/components/professionals';

export function useProfessionals() {
  const [results, setResults] = useState<ProfessionalCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const resultsRef = useRef<ProfessionalCardData[]>([]);

  const PAGE_SIZE = 20;

  const search = useCallback(async (params: SearchProfessionalsParams, reset = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : resultsRef.current.length;
      const data = await professionalsService.search({ ...params, limit: PAGE_SIZE, offset });
      setResults((prev) => {
        const next = reset ? data : [...prev, ...data];
        resultsRef.current = next;
        return next;
      });
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, hasMore, search };
}
