import { supabase } from './supabase';
import type { Category } from '@/types/models';

let cachedCategories: Category[] | null = null;

export const categoriesService = {
  async getAll(): Promise<Category[]> {
    if (cachedCategories) return cachedCategories;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(`Error fetching categories: ${error.message}`);
    cachedCategories = (data ?? []) as Category[];
    return cachedCategories;
  },

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Error fetching category: ${error.message}`);
    return data as Category;
  },

  clearCache() {
    cachedCategories = null;
  },
};
