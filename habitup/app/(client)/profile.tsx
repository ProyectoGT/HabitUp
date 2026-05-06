import React from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { supabase } from '@/services/supabase';
import { Screen, Card, Input, Button, Avatar } from '@/components/ui';
import { User, Phone, AlignLeft, Mail, LogOut, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ClientProfileScreen() {
  const router = useRouter();
  const { user, reset } = useAuthStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
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
    <Screen safeArea={false} className="flex-1">
      <View className="bg-primary px-6 pt-16 pb-20 rounded-b-[40px] shadow-sm shadow-primary/30 z-10 items-center">
        <Avatar 
          url={user?.avatar_url} 
          fallback={user?.full_name ?? '?'} 
          size="xl" 
          className="border-4 border-white/20 mb-3"
        />
        <Text className="text-2xl font-extrabold text-white mb-1">
          {user?.full_name}
        </Text>
        <Text className="text-white/80 font-medium">Cliente</Text>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-6 pb-12 -mt-10 z-20" showsVerticalScrollIndicator={false}>
        <Card variant="elevated" className="mb-6 p-5">
          <Text className="text-lg font-bold text-text mb-4">Datos personales</Text>
          
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nombre completo"
                value={value}
                onChangeText={onChange}
                error={errors.full_name?.message}
                leftIcon={<User size={20} color="#94A3B8" />}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Teléfono"
                value={value ?? ''}
                onChangeText={onChange}
                keyboardType="phone-pad"
                error={errors.phone?.message}
                leftIcon={<Phone size={20} color="#94A3B8" />}
              />
            )}
          />

          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Sobre mí"
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                error={errors.bio?.message}
                leftIcon={<AlignLeft size={20} color="#94A3B8" />}
              />
            )}
          />

          {errors.root && (
            <Text className="text-error text-sm mb-4 bg-error/10 p-2 rounded-lg">
              {errors.root.message}
            </Text>
          )}

          {isDirty && (
            <Button
              label="Guardar cambios"
              onPress={handleSubmit(onSave)}
              isLoading={isSubmitting}
              className="mt-2"
            />
          )}
        </Card>

        <Card variant="outlined" className="mb-6 p-0 overflow-hidden">
          <View className="p-4 border-b border-border/50 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                <Mail size={20} color="#6366F1" />
              </View>
              <View>
                <Text className="text-sm text-muted-text font-medium">Email de la cuenta</Text>
                <Text className="text-base text-text font-bold">{user?.email}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="p-4 flex-row items-center justify-between active:bg-surface-active"
            onPress={() => Alert.alert('Info', 'Función próximamente')}
          >
            <Text className="text-text font-semibold">Cambiar contraseña</Text>
            <ChevronRight size={20} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </Card>

        <Button
          label="Cerrar sesión"
          variant="outline"
          onPress={onSignOut}
          leftIcon={<LogOut size={20} color="#EF4444" />}
          className="border-error/30 bg-error/5"
          textClassName="text-error"
        />
      </ScrollView>
    </Screen>
  );
}
