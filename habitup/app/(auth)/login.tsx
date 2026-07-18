import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { loginSchema, type LoginFormData } from '@/utils/validators';
import { authService } from '@/services/auth.service';
import { getAuthErrorMessage } from '@/utils/authErrors';
import { Button, Input, Screen } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, getValues, formState: { errors, isSubmitting }, setError } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

  const submit = async (data: LoginFormData) => {
    try {
      await authService.signIn(data.email, data.password);
    } catch (error) {
      const message = getAuthErrorMessage(error, 'No hemos podido iniciar sesión.');
      if (message.includes('Confirma tu correo')) {
        router.push({ pathname: '/(auth)/verify-email', params: { email: getValues('email') } } as never);
        return;
      }
      setError('root', { message });
    }
  };

  return <Screen className="px-5 justify-center">
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="mb-8"><Text className="text-primary text-lg font-bold mb-5">HabitUp</Text><Text className="text-3xl font-bold text-text mb-2">Bienvenido de nuevo</Text><Text className="text-base text-muted-text">Accede a tus solicitudes, presupuestos y proyectos.</Text></View>
      <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <Input label="Correo electrónico" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" error={errors.email?.message} />} />
      <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <Input label="Contraseña" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={handleSubmit(submit)} error={errors.password?.message} rightIcon={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={12} onPress={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={20} color="#475569" /> : <Eye size={20} color="#475569" />}</Pressable>} />} />
      <View className="items-end mb-6"><Link href="/(auth)/forgot-password" className="text-primary font-semibold">He olvidado mi contraseña</Link></View>
      {errors.root?.message ? <Text accessibilityRole="alert" className="text-error bg-error/10 rounded-xl p-3 mb-4">{errors.root.message}</Text> : null}
      <Button label="Iniciar sesión" size="lg" isLoading={isSubmitting} onPress={handleSubmit(submit)} />
      <View className="flex-row justify-center mt-7"><Text className="text-muted-text">¿Aún no tienes cuenta? </Text><Link href="/(auth)/register" className="text-primary font-semibold">Crear cuenta</Link></View>
    </KeyboardAvoidingView>
  </Screen>;
}
