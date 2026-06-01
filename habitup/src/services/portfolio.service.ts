import { supabase } from './supabase';
import { storageService } from './storage.service';
import { trackEvent } from './analytics.service';
import type { PortfolioItem } from '@/types/models';

export interface CreatePortfolioParams {
  title: string;
  description?: string;
  category_id?: string;
  client_location?: string;
  completed_at?: string;
}

export const portfolioService = {
  async getByProfessional(professionalId: string): Promise<PortfolioItem[]> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, categories(name)')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PortfolioItem[];
  },

  async getMyItems(): Promise<PortfolioItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: profile } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, categories(name)')
      .eq('professional_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PortfolioItem[];
  },

  async create(params: CreatePortfolioParams): Promise<PortfolioItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: profile } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Perfil profesional no encontrado');

    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({
        professional_id: profile.id,
        title: params.title,
        description: params.description,
        category_id: params.category_id,
        client_location: params.client_location,
        completed_at: params.completed_at,
        photos: [],
        additional_photos: [],
      })
      .select()
      .single();

    if (error) throw error;

    trackEvent('portfolio_item_created', {
      portfolio_item_id: data.id,
      category_id: params.category_id,
    });

    return data as PortfolioItem;
  },

  async updatePhotos(itemId: string, photoUrls: string[]) {
    const { error } = await supabase
      .from('portfolio_items')
      .update({ photos: photoUrls })
      .eq('id', itemId);

    if (error) throw error;
  },

  async delete(itemId: string): Promise<void> {
    const item = await supabase
      .from('portfolio_items')
      .select('photos')
      .eq('id', itemId)
      .single();

    if (item.data?.photos) {
      const paths = (item.data.photos as string[]).map((url: string) => {
        const parts = url.split('/portfolio-images/');
        return parts[1] ?? url;
      });
      await Promise.all(paths.map((path) => storageService.remove('portfolio-images', path)));
    }

    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    trackEvent('portfolio_item_deleted', { portfolio_item_id: itemId });
  },
};
