import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ClipboardList, ShieldCheck } from 'lucide-react-native';
import { Button, Screen } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

const STEPS = [
  { title: 'Explica qué necesitas', body: 'Publica una solicitud con la ubicación, el plazo y las fotos que ayuden a entender el trabajo.', Icon: ClipboardList },
  { title: 'Compara con contexto', body: 'Revisa precio, alcance, plazo y perfil profesional antes de aceptar una propuesta.', Icon: ShieldCheck },
  { title: 'No pierdas ninguna respuesta', body: 'HabitUp te avisará cuando recibas presupuestos o cambie el estado de tu proyecto.', Icon: Bell },
];

export default function ClientOnboardingScreen() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = STEPS[step];
  const finish = async () => {
    if (step < STEPS.length - 1) { setStep((value) => value + 1); return; }
    setSaving(true); setError('');
    try {
      const user = await authService.updateCurrentUserProfile({ onboarding_completed_at: new Date().toISOString() });
      setUser(user);
      router.replace('/(client)/leads/create');
    } catch { setError('No hemos podido guardar el progreso. Vuelve a intentarlo.'); }
    finally { setSaving(false); }
  };
  return <Screen className="px-6 justify-between py-8"><View className="flex-row justify-between"><Text className="text-primary font-bold">HabitUp</Text><Text className="text-muted-text">{step + 1} de {STEPS.length}</Text></View><View><View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mb-7"><current.Icon size={32} color="#4F46E5" /></View><Text className="text-3xl font-bold text-text mb-3">{current.title}</Text><Text className="text-base leading-6 text-muted-text">{current.body}</Text></View><View>{error ? <Text className="text-error mb-4">{error}</Text> : null}<View className="flex-row gap-2 mb-6">{STEPS.map((_, index) => <View key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-border'}`} />)}</View><Button label={step === STEPS.length - 1 ? 'Crear mi primera solicitud' : 'Siguiente'} size="lg" isLoading={saving} onPress={finish} /></View></Screen>;
}
