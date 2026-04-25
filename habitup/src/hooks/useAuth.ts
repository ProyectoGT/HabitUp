import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { professionalsService } from '@/services/professionals.service';
import { USER_TYPES } from '@/utils/constants';

export function useAuth() {
  const { session, user, professionalProfile, isLoading, setSession, setUser, setProfessionalProfile, setLoading, reset } =
    useAuthStore();

  useEffect(() => {
    authService.getSession().then(async (s) => {
      setSession(s);
      if (s) {
        const profile = await authService.getCurrentUser();
        setUser(profile);
        if (profile?.user_type === USER_TYPES.PROFESSIONAL) {
          const proProfile = await professionalsService.getMyProfile();
          setProfessionalProfile(proProfile);
        }
      }
      setLoading(false);
    });

    const { data: listener } = authService.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s) {
        const profile = await authService.getCurrentUser();
        setUser(profile);
        if (profile?.user_type === USER_TYPES.PROFESSIONAL) {
          const proProfile = await professionalsService.getMyProfile();
          setProfessionalProfile(proProfile);
        }
      } else {
        reset();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, user, professionalProfile, isLoading };
}
