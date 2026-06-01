import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import type { ProfessionalProfile, ProfessionalProfileWithUser, Category, LeadWithCategoryAndClient } from '@/types/models';
import type { Database, Json } from '@/types/database.types';

type PublicProfessionalRow = Database['public']['Views']['professionals_with_categories']['Row'];

export interface ProfessionalSearchResult {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  company_name: string | null;
  description: string | null;
  avg_rating: number;
  total_reviews: number;
  total_projects_completed: number;
  location_city: string | null;
  location_region: string | null;
  categories: string | null;
  is_active: boolean;
  accepts_new_leads: boolean;
  nif_cif_verified: boolean;
  documents_verified: boolean;
}

export interface StripeOnboardingStatus {
  accountId: string | null;
  status: 'not_created' | 'pending' | 'active' | 'restricted' | 'disabled';
  enabled: boolean;
  canReceivePayments: boolean;
}

export interface CreateProfileParams {
  company_name?: string;
  company_type: 'autonomo' | 'empresa';
  description: string;
  experience_years: number;
  location_city: string;
  location_region: string;
  service_radius_km: number;
  website_url?: string;
  instagram_url?: string;
}

export interface SearchProfessionalsParams {
  category_slug?: string;
  city?: string;
  min_rating?: number;
  limit?: number;
  offset?: number;
}

function categoryNames(categories: Json): string | null {
  const list = Array.isArray(categories) ? categories : [];
  const names = list
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const value = item.name;
      return typeof value === 'string' ? value : null;
    })
    .filter((name): name is string => Boolean(name));

  return names.length > 0 ? names.join(', ') : null;
}

function toSearchResult(row: PublicProfessionalRow): ProfessionalSearchResult {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name ?? 'Profesional',
    avatar_url: row.avatar_url,
    company_name: row.company_name,
    description: row.description,
    avg_rating: row.avg_rating ?? 0,
    total_reviews: row.total_reviews ?? 0,
    total_projects_completed: row.total_projects_completed ?? 0,
    location_city: row.location_city,
    location_region: row.location_region,
    categories: categoryNames(row.categories),
    is_active: row.is_active ?? false,
    accepts_new_leads: row.accepts_new_leads ?? false,
    nif_cif_verified: row.nif_cif_verified ?? false,
    documents_verified: row.documents_verified ?? false,
  };
}

function toPublicProfile(row: PublicProfessionalRow): ProfessionalProfileWithUser {
  return {
    id: row.id,
    user_id: row.user_id,
    company_name: row.company_name,
    company_type: row.company_type,
    nif_cif: null,
    nif_cif_verified: row.nif_cif_verified ?? false,
    documents_verified: row.documents_verified ?? false,
    description: row.description,
    experience_years: row.experience_years,
    avg_rating: row.avg_rating ?? 0,
    total_reviews: row.total_reviews ?? 0,
    total_projects_completed: row.total_projects_completed ?? 0,
    response_time_hours: row.response_time_hours,
    location_city: row.location_city,
    location_region: row.location_region,
    location_country: 'Espana',
    service_radius_km: row.service_radius_km ?? 0,
    stripe_account_id: null,
    stripe_account_enabled: false,
    stripe_account_status: 'not_created',
    website_url: null,
    instagram_url: null,
    facebook_url: null,
    linkedin_url: null,
    is_active: row.is_active ?? false,
    accepts_new_leads: row.accepts_new_leads ?? false,
    hourly_rate: null,
    created_at: '',
    updated_at: '',
    users: {
      full_name: row.full_name ?? 'Profesional',
      avatar_url: row.avatar_url,
    },
  };
}

export const professionalsService = {
  async getMyProfile(): Promise<ProfessionalProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as ProfessionalProfile | null;
  },

  async getProfileByUserId(userId: string): Promise<ProfessionalProfile | null> {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as ProfessionalProfile | null;
  },

  async getProfileById(id: string): Promise<ProfessionalProfileWithUser | null> {
    const { data, error } = await supabase
      .from('professionals_with_categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return toPublicProfile(data as PublicProfessionalRow);
  },

  async createProfile(params: CreateProfileParams): Promise<ProfessionalProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('professional_profiles')
      .insert({ user_id: user.id, ...params })
      .select()
      .single();
    if (error) throw error;
    trackEvent('professional_onboarding_completed', {
      professional_id: data.id,
      city: params.location_city,
    });
    return data as ProfessionalProfile;
  },

  async updateProfile(params: Partial<CreateProfileParams>): Promise<ProfessionalProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('professional_profiles')
      .update(params)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data as ProfessionalProfile;
  },

  async search(params: SearchProfessionalsParams): Promise<ProfessionalSearchResult[]> {
    let query = supabase
      .from('professionals_with_categories')
      .select('*')
      .eq('is_active', true);

    if (params.city) {
      query = query.ilike('location_city', `%${params.city}%`);
    }
    if (params.min_rating) {
      query = query.gte('avg_rating', params.min_rating);
    }
    if (params.category_slug) {
      query = query.contains('categories', [{ slug: params.category_slug }]);
    }

    query = query
      .order('avg_rating', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as PublicProfessionalRow[]).map(toSearchResult);
  },

  async setCategories(professionalId: string, categoryIds: string[]) {
    await supabase
      .from('professional_categories')
      .delete()
      .eq('professional_id', professionalId);

    if (categoryIds.length === 0) return;

    const rows = categoryIds.map((id, idx) => ({
      professional_id: professionalId,
      category_id: id,
      is_primary: idx === 0,
    }));

    const { error } = await supabase.from('professional_categories').insert(rows);
    if (error) throw error;
  },

  async getStripeOnboardingStatus(): Promise<StripeOnboardingStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('professional_profiles')
      .select('stripe_account_id, stripe_account_status, stripe_account_enabled')
      .eq('user_id', user.id)
      .single();

    if (error?.code === 'PGRST116') {
      return { accountId: null, status: 'not_created', enabled: false, canReceivePayments: false };
    }
    if (error) throw error;

    const accountId = data?.stripe_account_id ?? null;
    const status = (data?.stripe_account_status ?? 'not_created') as StripeOnboardingStatus['status'];
    const enabled = data?.stripe_account_enabled ?? false;

    return {
      accountId,
      status,
      enabled,
      canReceivePayments: status === 'active' && enabled,
    };
  },

  subscribeToStripeStatus(
    profileId: string,
    onStatus: (
      status: Pick<
        ProfessionalProfile,
        'stripe_account_id' | 'stripe_account_status' | 'stripe_account_enabled'
      >,
    ) => void,
  ): () => void {
    const channel = supabase
      .channel(`stripe-status:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'professional_profiles',
          filter: `id=eq.${profileId}`,
        },
        (payload) => {
          onStatus(
            payload.new as Pick<
              ProfessionalProfile,
              'stripe_account_id' | 'stripe_account_status' | 'stripe_account_enabled'
            >,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Category[];
  },

  async getDashboardStats(professionalId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: categories } = await supabase
      .from('professional_categories')
      .select('category_id')
      .eq('professional_id', professionalId);

    const categoryIds = (categories ?? []).map((c: { category_id: string }) => c.category_id);

    const [projectsResult, activeProjectsResult, upcomingResult] = await Promise.all([
      supabase
        .from('projects')
        .select('agreed_price')
        .eq('professional_id', professionalId)
        .gte('created_at', startOfMonth.toISOString()),
      supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('professional_id', professionalId)
        .in('status', ['en_curso', 'pendiente_finalizacion']),
      supabase
        .from('projects')
        .select('id, title, start_date, status')
        .eq('professional_id', professionalId)
        .in('status', ['pendiente', 'en_curso'])
        .gte('start_date', new Date().toISOString().slice(0, 10))
        .order('start_date', { ascending: true })
        .limit(5),
    ]);

    const { data: profile } = await supabase
      .from('professional_profiles')
      .select('location_city')
      .eq('id', professionalId)
      .single();

    let countQuery = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'activo');

    let listQuery = supabase
      .from('leads')
      .select('*, categories(name, slug), users!client_id(full_name, avatar_url)')
      .eq('status', 'activo')
      .order('created_at', { ascending: false })
      .limit(5);

    if (categoryIds.length > 0) {
      countQuery = countQuery.in('category_id', categoryIds);
      listQuery = listQuery.in('category_id', categoryIds);
    }

    if (profile?.location_city) {
      countQuery = countQuery.eq('location_city', profile.location_city);
      listQuery = listQuery.eq('location_city', profile.location_city);
    }

    const [leadsResult, recentLeadsResult] = await Promise.all([
      countQuery,
      listQuery,
    ]);

    const monthlyIncome = (projectsResult.data ?? []).reduce((sum: number, p: { agreed_price: number }) => sum + (p.agreed_price ?? 0), 0);
    const activeProjects = activeProjectsResult.count ?? 0;
    const availableLeads = leadsResult.count ?? 0;

    return {
      monthlyIncome,
      activeProjects,
      availableLeads,
      recentLeads: (recentLeadsResult.data ?? []) as LeadWithCategoryAndClient[],
      upcoming: (upcomingResult.data ?? []) as { id: string; title: string; start_date: string; status: string }[],
    };
  },

  async getMyCategories(professionalId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('professional_categories')
      .select('categories(*)')
      .eq('professional_id', professionalId);
    if (error) throw error;
    return (data ?? []).flatMap((r: { categories: Category | Category[] }) =>
      Array.isArray(r.categories) ? r.categories : [r.categories],
    );
  },
};
