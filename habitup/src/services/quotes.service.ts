import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
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
    trackEvent('quote_sent', {
      quote_id: data.id,
      lead_id: params.lead_id,
      amount: params.amount,
    });
    return data as Quote;
  },

  async accept(quoteId: string): Promise<Project | null> {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('accept_quote', { p_quote_id: quoteId })
      .maybeSingle();

    if (!rpcError) {
      const result = rpcData as { project_id?: string } | null;
      if (result?.project_id) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', result.project_id)
          .single();
        if (projectError) throw projectError;
        trackEvent('quote_accepted', { quote_id: quoteId, project_id: project.id });
        trackEvent('project_created', { project_id: project.id });
        return project as Project;
      }
    } else if (!['42883', 'PGRST202'].includes(rpcError.code ?? '')) {
      throw rpcError;
    }

    const existingProject = await getProjectByQuoteId(quoteId);
    if (existingProject) return existingProject;

    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('*, leads(id, client_id, category_id, title, description)')
      .eq('id', quoteId)
      .single();
    if (quoteError) throw quoteError;

    const quote = quoteData as Quote & {
      leads: {
        id: string;
        client_id: string;
        category_id: string;
        title: string;
        description: string | null;
      } | null;
    };
    if (!quote.leads) throw new Error('Lead asociado no encontrado');

    const { error: acceptError } = await supabase
      .from('quotes')
      .update({ status: 'aceptado', accepted_at: new Date().toISOString() })
      .eq('id', quoteId);
    if (acceptError) throw acceptError;

    await supabase
      .from('quotes')
      .update({ status: 'rechazado', rejected_at: new Date().toISOString() })
      .eq('lead_id', quote.lead_id)
      .neq('id', quoteId)
      .in('status', ['enviado', 'visto']);

    await supabase
      .from('leads')
      .update({
        status: 'asignado',
        assigned_professional_id: quote.professional_id,
        closed_at: new Date().toISOString(),
      })
      .eq('id', quote.lead_id);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        lead_id: quote.lead_id,
        quote_id: quoteId,
        client_id: quote.leads.client_id,
        professional_id: quote.professional_id,
        category_id: quote.leads.category_id,
        title: quote.leads.title,
        description: quote.leads.description,
        agreed_price: quote.amount,
        currency: quote.currency,
      })
      .select()
      .single();
    if (projectError) throw projectError;
    trackEvent('quote_accepted', { quote_id: quoteId, project_id: project.id });
    trackEvent('project_created', { project_id: project.id, lead_id: quote.lead_id });
    return project as Project;
  },

  async reject(quoteId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'rechazado', rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq('id', quoteId);
    if (error) throw error;
  },
};

async function getProjectByQuoteId(quoteId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}
