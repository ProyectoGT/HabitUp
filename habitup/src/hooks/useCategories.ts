import { useState, useEffect } from 'react';
import { categoriesService } from '@/services/categories.service';
import type { Category } from '@/types/models';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    categoriesService
      .getAll()
      .then(setCategories)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar categorías'))
      .finally(() => setIsLoading(false));
  }, []);

  return { categories, isLoading, error };
}
