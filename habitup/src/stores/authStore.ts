import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User, ProfessionalProfile } from '@/types/models';

interface AuthState {
  session: Session | null;
  user: User | null;
  professionalProfile: ProfessionalProfile | null;
  isLoading: boolean;
  profileError: string | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfessionalProfile: (profile: ProfessionalProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setProfileError: (message: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  professionalProfile: null,
  isLoading: true,
  profileError: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfessionalProfile: (professionalProfile) => set({ professionalProfile }),
  setLoading: (isLoading) => set({ isLoading }),
  setProfileError: (profileError) => set({ profileError }),
  reset: () => set({ session: null, user: null, professionalProfile: null, isLoading: false, profileError: null }),
}));
