import { supabase } from './supabase';
import type { Quote } from '@/types/models';

export interface CreateQuoteParams {
  lead_id: string;
  amount: number;
  description?: string;
  delivery_days?: number;
  includes_materials?: boolean;
  payment_terms?: string;
  expires_at?: string;
}

export const quotesService = {
  async getQuotesForLead(leadId: string): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, professional_profiles(company_name, avg_rating, location_city, users(full_name, avatar_url))')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Quote[];
  },

  async getMyQuotes(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, leads(title, category_id, categories(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Quote[];
  },

  async create(params: CreateQuoteParams): Promise<Quote> {
    const { data: proData } = await supabase
      .from('professional_profiles')
      .select('id')
      .single();
    if (!proData) throw new Error('Perfil profesional no encontrado');

    const { data, error } = await supabase
      .from('quotes')
      .insert({ professional_id: proData.id, ...params })
      .select()
      .single();
    if (error) throw error;
    return data as Quote;
  },

  async accept(quoteId: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'aceptado', accepted_at: new Date().toISOString() })
      .eq('id', quoteId);
    if (error) throw error;
  },

  async reject(quoteId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'rechazado', rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq('id', quoteId);
    if (error) throw error;
  },
};
