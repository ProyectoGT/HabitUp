import { supabase } from './supabase';
import type { Project } from '@/types/models';
import { PROJECT_STATUS } from '@/utils/constants';

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export type ProjectWithDetails = Project & {
  categories: { name: string } | null;
  client?: { id: string; full_name: string; avatar_url: string | null };
  professional?: {
    id: string;
    company_name: string | null;
    user_id: string;
    users: { full_name: string; avatar_url: string | null };
  };
};

export const projectsService = {
  async getById(id: string): Promise<ProjectWithDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        categories(name),
        client:users!client_id(id, full_name, avatar_url),
        professional:professional_profiles!professional_id(
          id, company_name, user_id,
          users(full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as unknown as ProjectWithDetails;
  },

  async updateStatus(id: string, status: ProjectStatus): Promise<void> {
    const updates: Record<string, string> = { status };
    if (status === PROJECT_STATUS.COMPLETED) {
      updates.actual_end_date = new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // Solo el profesional puede crear el proyecto al aceptarse un quote.
  // Normalmente se crea via trigger o Edge Function, pero lo exponemos por si acaso.
  async createFromQuote(quoteId: string): Promise<Project> {
    const { data: quote } = await supabase
      .from('quotes')
      .select('*, leads(title, description, category_id)')
      .eq('id', quoteId)
      .single();
    if (!quote) throw new Error('Quote no encontrado');

    const lead = quote.leads as { title: string; description: string; category_id: string } | null;
    if (!lead) throw new Error('Lead asociado no encontrado');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        lead_id: quote.lead_id,
        quote_id: quoteId,
        client_id: user.id,
        professional_id: quote.professional_id,
        category_id: lead.category_id,
        title: lead.title,
        description: lead.description,
        agreed_price: quote.amount,
        currency: quote.currency,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },
};
