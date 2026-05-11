import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
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
  async getMyLeads(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*, categories(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  async getById(id: string): Promise<Lead | null> {
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
    const { data, error } = await supabase
      .from('leads')
      .select('*, categories(name, slug), users!client_id(full_name, avatar_url)')
      .eq('status', 'activo')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Lead[];
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
      .update({ status: 'cancelado' })
      .eq('id', id);
    if (error) throw error;
  },
};
