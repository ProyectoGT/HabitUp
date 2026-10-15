import { useState } from 'react';
import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Screen } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { getAuthErrorMessage } from '@/utils/authErrors';

const schema = z.object({ password: z.string().min(8, 'Usa al menos 8 caracteres').regex(/[A-Z]/, 'Añade una mayúscula').regex(/[a-z]/, 'Añade una minúscula').regex(/[0-9]/, 'Añade un número'), confirmation: z.string() }).refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden' });
type FormData = z.infer<typeof schema>;
export default function ResetPasswordScreen() {
  const [complete, setComplete] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { password: '', confirmation: '' } });
  const submit = async ({ password }: FormData) => { try { await authService.updatePassword(password); setComplete(true); } catch (error) { setError('root', { message: getAuthErrorMessage(error, 'No hemos podido cambiar la contraseña.') }); } };
  if (complete) return <Screen className="px-5 justify-center"><Text className="text-3xl font-bold text-text mb-3">Contraseña actualizada</Text><Text className="text-muted-text text-base mb-8">Ya puedes usar tu nueva contraseña.</Text><Link href="/(auth)/login" className="text-primary font-semibold text-center">Ir a iniciar sesión</Link></Screen>;
  return <Screen className="px-5 justify-center"><Text className="text-3xl font-bold text-text mb-2">Crea una contraseña nueva</Text><Text className="text-muted-text text-base mb-8">Usa una contraseña que no hayas utilizado antes.</Text><Controller control={control} name="password" render={({ field: { value, onChange, onBlur } }) => <Input label="Nueva contraseña" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry autoComplete="new-password" error={errors.password?.message} hint="8 caracteres, mayúscula, minúscula y número" />} /><Controller control={control} name="confirmation" render={({ field: { value, onChange, onBlur } }) => <Input label="Confirma la contraseña" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry autoComplete="new-password" error={errors.confirmation?.message} />} />{errors.root?.message ? <Text className="text-error mb-4">{errors.root.message}</Text> : null}<Button label="Guardar contraseña" size="lg" isLoading={isSubmitting} onPress={handleSubmit(submit)} /></Screen>;
}
