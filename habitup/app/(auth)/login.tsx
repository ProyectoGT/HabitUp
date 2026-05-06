import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Screen, Input, Button } from '@/components/ui';
import { Mail, Lock } from 'lucide-react-native';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.signIn(data.email, data.password);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError('root', { message });
    }
  };

  return (
    <Screen safeArea className="px-6 justify-center">
      <View className="mb-10 mt-10">
        <Text className="text-4xl font-extrabold text-primary mb-2">HabitUp</Text>
        <Text className="text-2xl font-bold text-text mb-2">Bienvenido de nuevo</Text>
        <Text className="text-muted-text text-base">Inicia sesión para continuar.</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Correo electrónico"
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
            leftIcon={<Mail size={20} color="#94A3B8" />}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
            leftIcon={<Lock size={20} color="#94A3B8" />}
          />
        )}
      />
      
      {errors.root && (
        <Text className="text-error text-sm text-center mb-4 bg-error/10 p-2 rounded-lg overflow-hidden">
          {errors.root.message}
        </Text>
      )}

      <View className="items-end mb-8 mt-2">
        <Link href="/(auth)/forgot-password" className="text-primary font-medium text-sm">
          ¿Olvidaste tu contraseña?
        </Link>
      </View>

      <Button
        label="Iniciar Sesión"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        size="lg"
        className="w-full shadow-sm shadow-primary/30"
      />

      <View className="flex-row justify-center mt-8">
        <Text className="text-muted-text">¿No tienes cuenta? </Text>
        <Link href="/(auth)/register" className="text-primary font-bold">Regístrate</Link>
      </View>
    </Screen>
  );
}
