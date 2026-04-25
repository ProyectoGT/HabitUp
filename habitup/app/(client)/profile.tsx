import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { supabase } from '@/services/supabase';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ClientProfileScreen() {
  const router = useRouter();
  const { user, reset } = useAuthStore();

  const { control, handleSubmit, formState: { errors, isSubmitting, isDirty }, setError } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        full_name: user?.full_name ?? '',
        phone: user?.phone ?? '',
        bio: user?.bio ?? '',
      },
    });

  const onSave = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user!.id);
      if (error) throw error;
      Alert.alert('Guardado', 'Perfil actualizado correctamente');
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Error al guardar' });
    }
  };

  const onSignOut = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          await authService.signOut();
          reset();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-6 pt-14 pb-10">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Mi perfil</Text>

      <View className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <Field label="Nombre completo" error={errors.full_name?.message}>
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Teléfono" error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3"
                keyboardType="phone-pad"
                onChangeText={onChange}
                value={value ?? ''}
              />
            )}
          />
        </Field>

        <Field label="Sobre mí" error={errors.bio?.message}>
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="border border-gray-200 rounded-lg px-4 py-3"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onChangeText={onChange}
                value={value ?? ''}
              />
            )}
          />
        </Field>

        {errors.root && <Text className="text-red-500 text-sm mb-2">{errors.root.message}</Text>}

        {isDirty && (
          <TouchableOpacity
            onPress={handleSubmit(onSave)}
            disabled={isSubmitting}
            className="bg-brand py-3 rounded-xl items-center mt-2"
          >
            {isSubmitting
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold">Guardar cambios</Text>}
          </TouchableOpacity>
        )}
      </View>

      <View className="bg-white rounded-2xl p-5 shadow-sm">
        <Text className="text-gray-500 text-sm mb-1">Email</Text>
        <Text className="text-gray-900 font-medium mb-4">{user?.email}</Text>

        <TouchableOpacity
          onPress={onSignOut}
          className="border border-red-400 py-3 rounded-xl items-center"
        >
          <Text className="text-red-500 font-semibold">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      {children}
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
