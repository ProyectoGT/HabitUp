import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import { LEAD_STATUS } from '@/utils/constants';
import type { Lead } from '@/types/models';

export interface CreateLeadParams {
  category_id: string;
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  location_city: string;
  preferred_start_date?: string;
  urgency: 'baja' | 'media' | 'alta';
  photos?: string[];
}

export const leadsService = {
  async getMyLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*, categories(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('*, categories(name, slug)')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as Lead;
  },

  async getAvailableForProfessional(): Promise<Lead[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, location_city, location_region, service_radius_km')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) return [];

    const { data: categories } = await supabase
      .from('professional_categories')
      .select('category_id')
      .eq('professional_id', profile.id);

    const categoryIds = (categories ?? []).map((c: { category_id: string }) => c.category_id);
    if (categoryIds.length === 0) return [];

    let query = supabase
      .from('leads')
      .select('*, categories(name, slug), users!client_id(full_name, avatar_url)')
      .eq('status', LEAD_STATUS.ACTIVE)
      .in('category_id', categoryIds)
      .order('created_at', { ascending: false });

    if (profile.location_city) {
      query = query.eq('location_city', profile.location_city);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  subscribeToAvailableLeads(onChange: () => void): () => void {
    const channel = supabase
      .channel('available-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `status=eq.${LEAD_STATUS.ACTIVE}`,
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async create(params: CreateLeadParams): Promise<Lead> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('leads')
      .insert({ client_id: user.id, ...params, photos: params.photos ?? [] })
      .select()
      .single();
    if (error) throw error;
    trackEvent('lead_published', {
      lead_id: data.id,
      category_id: params.category_id,
      urgency: params.urgency,
      city: params.location_city,
    });
    return data as Lead;
  },

  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .update({ status: LEAD_STATUS.CANCELLED })
      .eq('id', id);
    if (error) throw error;
  },
};
