import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { professionalsService } from '@/services/professionals.service';
import { USER_TYPES } from '@/utils/constants';

export function useAuth() {
  const { session, user, professionalProfile, isLoading, profileError, setSession, setUser, setProfessionalProfile, setLoading, setProfileError, reset } =
    useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const s = await withTimeout(authService.getSession(), 5000);
        if (!isMounted) return;

        setSession(s);
        if (!s) return;

        const profile = await withTimeout(authService.getCurrentUser(), 5000);
        if (!isMounted) return;

        setUser(profile);
        if (!profile) return;

        if (profile.user_type === USER_TYPES.PROFESSIONAL) {
          const proProfile = await withTimeout(professionalsService.getMyProfile(), 5000);
          if (isMounted) setProfessionalProfile(proProfile);
        }
      } catch (error) {
        if (isMounted) setProfileError(error instanceof Error ? error.message : 'No se ha podido cargar el perfil');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    const { data: listener } = authService.onAuthStateChange(async (event, s) => {
      setLoading(true);
      setSession(s);
      if (s) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          if (profile?.user_type === USER_TYPES.PROFESSIONAL) {
            const proProfile = await professionalsService.getMyProfile();
            setProfessionalProfile(proProfile);
          } else {
            setProfessionalProfile(null);
          }
        } catch (error) {
          setProfileError(error instanceof Error ? error.message : 'No se ha podido cargar el perfil');
        } finally {
          setLoading(false);
        }
      } else {
        reset();
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [reset, setLoading, setProfessionalProfile, setProfileError, setSession, setUser]);

  useEffect(() => {
    let active = true;
    const completeLink = async (url: string | null) => {
      if (!url || !url.startsWith('habitup://')) return;
      try {
        const nextSession = await authService.completeAuthLink(url);
        if (active && nextSession) setSession(nextSession);
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : 'El enlace no es válido o ha caducado');
      }
    };
    void Linking.getInitialURL().then(completeLink);
    const subscription = Linking.addEventListener('url', ({ url }) => { void completeLink(url); });
    return () => { active = false; subscription.remove(); };
  }, [setProfileError, setSession]);

  return { session, user, professionalProfile, isLoading, profileError };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout')), ms);
    }),
  ]);
}
