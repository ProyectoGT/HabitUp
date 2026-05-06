import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { Screen, Input, Button } from '@/components/ui';
import { Mail, Lock, User, Briefcase, CheckCircle2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  user_type: z.enum(['cliente', 'professional']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { control, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { user_type: 'cliente' },
  });

  const userType = watch('user_type');

  const onSubmit = async (data: FormData) => {
    try {
      await authService.signUp(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al registrarse';
      setError('root', { message });
    }
  };

  return (
    <Screen safeArea>
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-10" showsVerticalScrollIndicator={false}>
        <View className="mb-8 mt-4">
          <Text className="text-4xl font-extrabold text-primary mb-2">Crear cuenta</Text>
          <Text className="text-muted-text text-base">Únete a HabitUp y comienza tu experiencia.</Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-text mb-3">¿Qué estás buscando?</Text>
          <View className="flex-row gap-3">
            {(['cliente', 'professional'] as const).map((type) => {
              const isSelected = userType === type;
              return (
                <Controller
                  key={type}
                  control={control}
                  name="user_type"
                  render={({ field: { onChange } }) => (
                    <TouchableOpacity
                      onPress={() => onChange(type)}
                      activeOpacity={0.7}
                      className={`flex-1 p-4 rounded-2xl border-2 items-center justify-center ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                      }`}
                    >
                      {type === 'cliente' ? (
                        <User color={isSelected ? '#6366F1' : (isDark ? '#94A3B8' : '#64748B')} size={28} className="mb-2" />
                      ) : (
                        <Briefcase color={isSelected ? '#6366F1' : (isDark ? '#94A3B8' : '#64748B')} size={28} className="mb-2" />
                      )}
                      <Text className={`font-semibold ${isSelected ? 'text-primary' : 'text-muted-text'}`}>
                        {type === 'cliente' ? 'Soy Cliente' : 'Soy Profesional'}
                      </Text>
                      {isSelected && (
                        <View className="absolute top-2 right-2">
                          <CheckCircle2 color="#6366F1" size={16} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                />
              );
            })}
          </View>
        </View>

        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              onChangeText={onChange}
              value={value}
              error={errors.full_name?.message}
              leftIcon={<User size={20} color="#94A3B8" />}
            />
          )}
        />

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
          <Text className="text-error text-sm text-center my-2 bg-error/10 p-2 rounded-lg overflow-hidden">
            {errors.root.message}
          </Text>
        )}

        <Button
          label="Crear cuenta"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          size="lg"
          className="w-full mt-6 shadow-sm shadow-primary/30"
        />

        <View className="flex-row justify-center mt-8 mb-4">
          <Text className="text-muted-text">¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" className="text-primary font-bold">Iniciar sesión</Link>
        </View>
      </ScrollView>
    </Screen>
  );
}
