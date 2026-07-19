import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { Button, Input, Screen } from '@/components/ui';

const schema = z.object({ email: z.string().trim().toLowerCase().email('Introduce un correo válido') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [sentTo, setSentTo] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const submit = async ({ email }: FormData) => {
    try { await authService.resetPassword(email); setSentTo(email); }
    catch (error) { setError('root', { message: getAuthErrorMessage(error, 'No hemos podido enviar el correo.') }); }
  };
  return <Screen className="px-5 justify-center">
    <Text className="text-3xl font-bold text-text mb-2">Recupera tu contraseña</Text>
    <Text className="text-base text-muted-text mb-8">{sentTo ? `Si existe una cuenta para ${sentTo}, recibirás un enlace para crear una contraseña nueva.` : 'Te enviaremos un enlace seguro para crear una contraseña nueva.'}</Text>
    {sentTo ? <><Button label="Enviar de nuevo" variant="outline" isLoading={isSubmitting} onPress={handleSubmit(submit)} /><Link href="/(auth)/login" className="text-primary text-center font-semibold mt-6">Volver a iniciar sesión</Link></> : <><Controller control={control} name="email" render={({ field: { value, onChange, onBlur } }) => <Input label="Correo electrónico" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email?.message} />} />{errors.root?.message ? <Text accessibilityRole="alert" className="text-error mb-4">{errors.root.message}</Text> : null}<Button label="Enviar enlace" size="lg" isLoading={isSubmitting} onPress={handleSubmit(submit)} /><Link href="/(auth)/login" className="text-primary text-center font-semibold mt-6">Volver a iniciar sesión</Link></>}
  </Screen>;
}
