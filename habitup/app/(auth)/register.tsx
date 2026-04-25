import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  user_type: z.enum(['cliente', 'professional']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
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
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-12">
      <Text className="text-3xl font-bold text-center text-brand mb-8">HabitUp</Text>
      <Text className="text-xl font-semibold mb-6">Crear cuenta</Text>

      {/* Selector de rol */}
      <View className="flex-row mb-6 gap-3">
        {(['cliente', 'professional'] as const).map((type) => (
          <Controller
            key={type}
            control={control}
            name="user_type"
            render={({ field: { onChange } }) => (
              <TouchableOpacity
                onPress={() => onChange(type)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  userType === type ? 'bg-brand border-brand' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={userType === type ? 'text-white font-semibold' : 'text-gray-600'}>
                  {type === 'cliente' ? 'Cliente' : 'Profesional'}
                </Text>
              </TouchableOpacity>
            )}
          />
        ))}
      </View>

      <Controller
        control={control}
        name="full_name"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-1"
            placeholder="Nombre completo"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.full_name && <Text className="text-red-500 text-sm mb-3">{errors.full_name.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-1 mt-3"
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.email && <Text className="text-red-500 text-sm mb-3">{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-1 mt-3"
            placeholder="Contraseña"
            secureTextEntry
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.password && <Text className="text-red-500 text-sm mb-3">{errors.password.message}</Text>}
      {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="bg-brand py-4 rounded-xl items-center mt-6"
      >
        {isSubmitting
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-semibold text-base">Crear cuenta</Text>}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">¿Ya tienes cuenta? </Text>
        <Link href="/(auth)/login" className="text-brand font-semibold">Iniciar sesión</Link>
      </View>
    </ScrollView>
  );
}
