import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return <Screen className="px-6 items-center justify-center"><Text className="text-3xl font-bold text-text text-center mb-3">Esta pantalla no está disponible</Text><Text className="text-muted-text text-base text-center mb-8">Puede que el enlace haya caducado o que el contenido ya no exista.</Text><Button label="Volver al inicio" onPress={() => router.replace('/')} /></Screen>;
}
