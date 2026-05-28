import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import type { Review } from '@/types/models';

export interface CreateReviewParams {
  project_id: string;
  professional_id: string;
  rating: number;
  title?: string;
  comment?: string;
  rating_quality?: number;
  rating_communication?: number;
  rating_timeline?: number;
  rating_value?: number;
}

export const reviewsService = {
  async getByProfessional(professionalId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users!reviewer_id(full_name, avatar_url)')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Review[];
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as Review | null;
  },

  async create(params: CreateReviewParams): Promise<Review> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('reviews')
      .insert({ ...params, reviewer_id: user.id })
      .select()
      .single();
    if (error) throw error;
    trackEvent('review_created', {
      project_id: params.project_id,
      professional_id: params.professional_id,
      rating: params.rating,
    });
    return data as Review;
  },
};
