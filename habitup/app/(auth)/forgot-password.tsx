import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { authService } from '@/services/auth.service';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.resetPassword(data.email);
      setSent(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al enviar el email';
      setError('root', { message });
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-xl font-semibold mb-2">Recuperar contraseña</Text>
      <Text className="text-gray-500 mb-6">Te enviaremos un enlace para restablecer tu contraseña.</Text>

      {sent ? (
        <>
          <Text className="text-green-600 mb-6">Email enviado. Revisa tu bandeja de entrada.</Text>
          <Link href="/(auth)/login" className="text-brand text-center font-semibold">Volver al login</Link>
        </>
      ) : (
        <>
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
          {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-brand py-4 rounded-xl items-center mt-4"
          >
            {isSubmitting
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold">Enviar email</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" className="text-brand text-center mt-4">Volver al login</Link>
        </>
      )}
    </View>
  );
}
