import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { Button, Screen } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { getAuthErrorMessage } from '@/utils/authErrors';

export default function VerifyEmailScreen() {
  const { email: rawEmail } = useLocalSearchParams<{ email?: string }>();
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (!seconds) return; const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(timer); }, [seconds]);
  const resend = async () => { if (!email || seconds) return; setLoading(true); setMessage(''); try { await authService.resendConfirmation(email); setSeconds(60); setMessage('Hemos enviado un correo nuevo.'); } catch (error) { setMessage(getAuthErrorMessage(error, 'No hemos podido reenviar el correo.')); } finally { setLoading(false); } };
  return <Screen className="px-6 items-center justify-center"><MailCheck size={52} color="#4F46E5" /><Text className="text-3xl font-bold text-text text-center mt-6 mb-3">Revisa tu correo</Text><Text className="text-base text-muted-text text-center leading-6 mb-8">Hemos enviado un enlace de confirmación{email ? ` a ${email}` : ''}. Ábrelo para activar tu cuenta.</Text>{message ? <Text accessibilityLiveRegion="polite" className="text-text text-center mb-4">{message}</Text> : null}<Button label={seconds ? `Reenviar en ${seconds} s` : 'Reenviar correo'} variant="outline" disabled={!!seconds || !email} isLoading={loading} onPress={resend} className="w-full" /><Link href="/(auth)/register" className="text-primary font-semibold mt-6">Usar otro correo</Link><Link href="/(auth)/login" className="text-primary font-semibold mt-5">Ya lo he confirmado</Link></Screen>;
}
