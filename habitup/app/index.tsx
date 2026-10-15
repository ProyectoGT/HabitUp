import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { professionalsService } from '@/services/professionals.service';
import { USER_TYPES } from '@/utils/constants';

export default function BootstrapScreen() {
  const { session, user, profileError, setUser, setProfessionalProfile, setProfileError } = useAuthStore();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    if (!session) return;
    setRetrying(true);
    setProfileError(null);
    try {
      const nextUser = await authService.getCurrentUser();
      setUser(nextUser);
      if (nextUser?.user_type === USER_TYPES.PROFESSIONAL) {
        setProfessionalProfile(await professionalsService.getMyProfile());
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'No se ha podido cargar tu perfil');
    } finally { setRetrying(false); }
  };

  return <Screen className="px-6 items-center justify-center">
    <View className="w-14 h-14 rounded-xl bg-primary items-center justify-center mb-6"><Text className="text-white text-xl font-bold">H</Text></View>
    <Text className="text-2xl font-bold text-text mb-2">HabitUp</Text>
    {profileError && session && !user ? <><Text className="text-muted-text text-center mb-6">Tu sesión sigue activa, pero no hemos podido cargar el perfil. Comprueba la conexión y vuelve a intentarlo.</Text><Button label="Volver a intentar" isLoading={retrying} onPress={retry} /></> : <Text className="text-muted-text">Preparando tu cuenta…</Text>}
  </Screen>;
}
