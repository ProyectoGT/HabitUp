import { useState, useCallback } from 'react';
import { professionalsService, type SearchProfessionalsParams } from '@/services/professionals.service';
import type { ProfessionalCardData } from '@/components/professionals';

export function useProfessionals() {
  const [results, setResults] = useState<ProfessionalCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const search = useCallback(async (params: SearchProfessionalsParams, reset = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : results.length;
      const data = await professionalsService.search({ ...params, limit: PAGE_SIZE, offset });
      setResults(reset ? data : [...results, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setIsLoading(false);
    }
  }, [results]);

  return { results, isLoading, error, hasMore, search };
}
