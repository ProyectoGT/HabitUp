import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import type { User } from '@/types/models';

export interface SignUpParams {
  email: string;
  password: string;
  full_name: string;
  user_type: 'cliente' | 'professional';
}

export interface UpdateUserProfileParams {
  full_name?: string;
  phone?: string | null;
  bio?: string | null;
}

export const authService = {
  async signUp({ email, password, full_name, user_type }: SignUpParams) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, user_type } },
    });
    if (error) throw error;
    trackEvent('user_signed_up', { role: user_type });
    trackEvent('role_selected', { role: user_type });
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    return data as User;
  },

  async updateCurrentUserProfile(params: UpdateUserProfileParams): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('users')
      .update(params)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
