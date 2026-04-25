import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';

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
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold text-center text-brand mb-8">HabitUp</Text>
      <Text className="text-xl font-semibold mb-6">Iniciar sesión</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-1"
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

      <Link href="/(auth)/forgot-password" className="text-brand text-right mb-6">
        ¿Olvidaste tu contraseña?
      </Link>

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="bg-brand py-4 rounded-xl items-center"
      >
        {isSubmitting
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-semibold text-base">Entrar</Text>}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">¿No tienes cuenta? </Text>
        <Link href="/(auth)/register" className="text-brand font-semibold">Regístrate</Link>
      </View>
    </View>
  );
}
