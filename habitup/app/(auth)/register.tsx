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

function friendlySignUpError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  if (message.includes('rate limit')) {
    return 'Se ha superado el límite de envío de correos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (message.includes('already registered')) {
    return 'Ya existe una cuenta con este correo. Prueba a iniciar sesión.';
  }
  return message || 'Error al registrarse';
}

export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [pendingConfirmation, setPendingConfirmation] = React.useState(false);

  const { control, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { user_type: 'cliente' },
  });

  const userType = watch('user_type');

  const onSubmit = async (data: FormData) => {
    try {
      const { session } = await authService.signUp(data);
      // Con confirmación de email activada, signUp no devuelve sesión:
      // la cuenta existe pero hay que confirmar el correo antes de entrar.
      if (!session) setPendingConfirmation(true);
    } catch (e: unknown) {
      setError('root', { message: friendlySignUpError(e) });
    }
  };

  if (pendingConfirmation) {
    return (
      <Screen safeArea>
        <View className="flex-1 items-center justify-center px-8">
          <CheckCircle2 color="#22C55E" size={56} />
          <Text className="text-2xl font-extrabold text-text mt-6 mb-2 text-center">Cuenta creada</Text>
          <Text className="text-muted-text text-base text-center mb-8">
            Te hemos enviado un correo de confirmación. Confirma tu email y después inicia sesión.
          </Text>
          <Link href="/(auth)/login" className="text-primary font-bold text-lg">Ir a iniciar sesión</Link>
        </View>
      </Screen>
    );
  }

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
