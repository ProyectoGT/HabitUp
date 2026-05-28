import { useState, useCallback } from 'react';
import { reviewsService, CreateReviewParams } from '@/services/reviews.service';
import type { Review } from '@/types/models';

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByProfessional = useCallback(async (professionalId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reviewsService.getByProfessional(professionalId);
      setReviews(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reseñas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchByProject = useCallback(async (projectId: string): Promise<Review | null> => {
    setError(null);
    try {
      return await reviewsService.getByProject(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar reseña');
      return null;
    }
  }, []);

  const createReview = useCallback(async (params: CreateReviewParams): Promise<Review | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const review = await reviewsService.create(params);
      setReviews((prev) => [review, ...prev]);
      return review;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al publicar reseña');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reviews,
    isLoading,
    error,
    fetchByProfessional,
    fetchByProject,
    createReview,
  };
}
