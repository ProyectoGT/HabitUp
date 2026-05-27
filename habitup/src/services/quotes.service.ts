import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import { QUOTE_STATUS } from '@/utils/constants';
import type { Project, Quote } from '@/types/models';

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
  async getQuotesForLead(leadId: string) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, professional_profiles(company_name, avg_rating, location_city, users(full_name, avatar_url))')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getMyQuotes() {
    const { data, error } = await supabase
      .from('quotes')
      .select('*, leads(title, category_id, categories(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(params: CreateQuoteParams): Promise<Quote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: proData } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!proData) throw new Error('Perfil profesional no encontrado');

    const { data, error } = await supabase
      .from('quotes')
      .insert({ professional_id: proData.id, ...params })
      .select()
      .single();
    if (error) throw error;
    trackEvent('quote_sent', {
      quote_id: data.id,
      lead_id: params.lead_id,
      amount: params.amount,
    });
    return data;
  },

  async accept(quoteId: string): Promise<Project> {
    const { data, error } = await supabase
      .rpc('accept_quote', { p_quote_id: quoteId })
      .maybeSingle();

    if (error) {
      const hint = (error as { details?: string })?.details ?? '';
      if (hint === 'quote_not_found') {
        throw new Error('Presupuesto no encontrado');
      }
      if (hint === 'lead_not_found') {
        throw new Error('Solicitud no encontrada');
      }
      if (hint === 'not_lead_owner') {
        throw new Error('No puedes aceptar presupuestos de otra solicitud');
      }
      if (hint === 'lead_not_available') {
        throw new Error('La solicitud ya no admite presupuestos');
      }
      if (hint === 'quote_not_acceptable') {
        throw new Error('Este presupuesto no se puede aceptar');
      }
      throw error;
    }

    if (!data) throw new Error('Error al aceptar el presupuesto');

    const project = data as Project;

    trackEvent('quote_accepted', { quote_id: quoteId, project_id: project.id });
    trackEvent('project_created', { project_id: project.id });

    return project;
  },

  async reject(quoteId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .update({ status: QUOTE_STATUS.REJECTED, rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq('id', quoteId);
    if (error) throw error;
  },
};


