import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import type { User } from '@/types/models';

export interface SignUpParams {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  locality: string;
  postal_code: string;
  user_type: 'cliente' | 'professional';
  accepted_terms: boolean;
  marketing_consent: boolean;
}

export interface UpdateUserProfileParams {
  full_name?: string;
  phone?: string | null;
  bio?: string | null;
  onboarding_completed_at?: string | null;
}

export const authService = {
  async signUp(params: SignUpParams) {
    const { email, password, ...metadata } = params;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: 'habitup://verify-email' },
    });
    if (error) throw error;
    trackEvent('user_signed_up', { role: params.user_type });
    trackEvent('role_selected', { role: params.user_type });
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

  async deleteAccount() {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'habitup://reset-password',
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'habitup://verify-email' },
    });
    if (error) throw error;
  },

  async completeAuthLink(url: string) {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data.session;
    }

    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      return data.session;
    }
    return null;
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
