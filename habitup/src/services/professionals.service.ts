import { supabase } from './supabase';
import type { ProfessionalProfile, Category } from '@/types/models';

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

export const professionalsService = {
  async getMyProfile(): Promise<ProfessionalProfile | null> {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .single();
    if (error?.code === 'PGRST116') return null; // no rows
    if (error) throw error;
    return data as ProfessionalProfile;
  },

  async getProfileByUserId(userId: string): Promise<ProfessionalProfile | null> {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as ProfessionalProfile;
  },

  async getProfileById(id: string): Promise<ProfessionalProfile | null> {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as ProfessionalProfile;
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
    return data as ProfessionalProfile;
  },

  async updateProfile(params: Partial<CreateProfileParams>): Promise<ProfessionalProfile> {
    const { data, error } = await supabase
      .from('professional_profiles')
      .update(params)
      .select()
      .single();
    if (error) throw error;
    return data as ProfessionalProfile;
  },

  async search(params: SearchProfessionalsParams) {
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
      query = query.ilike('categories', `%${params.category_slug}%`);
    }

    query = query
      .order('avg_rating', { ascending: false })
      .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async setCategories(professionalId: string, categoryIds: string[]) {
    // Reemplaza todas las categorías del profesional
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

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Category[];
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
