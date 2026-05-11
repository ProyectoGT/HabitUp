import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { professionalsService } from '@/services/professionals.service';
import { USER_TYPES } from '@/utils/constants';

export function useAuth() {
  const { session, user, professionalProfile, isLoading, setSession, setUser, setProfessionalProfile, setLoading, reset } =
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
      } catch {
        if (isMounted) reset();
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
        } catch {
          reset();
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
  }, []);

  return { session, user, professionalProfile, isLoading };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout')), ms);
    }),
  ]);
}
