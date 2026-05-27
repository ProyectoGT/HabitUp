import React from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { supabase } from '@/services/supabase';
import { Screen, Card, Input, Button, Avatar } from '@/components/ui';
import {
  User, Phone, AlignLeft, Mail, LogOut,
  ChevronRight, Bell, CreditCard, Shield,
  HelpCircle, Moon, Settings,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const MENU_SECTIONS = [
  {
    title: 'Cuenta',
    items: [
      { Icon: User,       label: 'Información personal',  action: null },
      { Icon: Bell,       label: 'Notificaciones',        action: null },
      { Icon: CreditCard, label: 'Métodos de pago',       action: null },
    ],
  },
  {
    title: 'Soporte',
    items: [
      { Icon: HelpCircle, label: 'Ayuda y soporte',        action: null },
      { Icon: Shield,     label: 'Privacidad y seguridad', action: null },
      { Icon: Settings,   label: 'Configuración',          action: null },
    ],
  },
];

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
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 64, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' }}
      >
        <Avatar
          url={user?.avatar_url}
          fallback={user?.full_name ?? '?'}
          size="xl"
          style={{ borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 12 }}
        />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
          {user?.full_name}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Cliente</Text>
      </LinearGradient>

      {/* ── Stats grid ── */}
      <View
        className="mx-6 bg-surface rounded-2xl border border-border"
        style={{ marginTop: -20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
      >
        <View className="flex-row">
          {[
            { value: '12', label: 'Completados' },
            { value: '3',  label: 'Activos' },
            { value: '4.8', label: 'Rating' },
          ].map((stat, idx) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 18,
                borderRightWidth: idx < 2 ? 1 : 0,
                borderRightColor: isDark ? '#2D3548' : '#E2E8F0',
              }}
            >
              <Text className="text-2xl font-bold text-primary">{stat.value}</Text>
              <Text className="text-xs text-muted-text mt-1">{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── Personal data ── */}
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

        {/* ── Email / password ── */}
        <Card variant="outlined" className="mb-6 p-0 overflow-hidden">
          <View className="p-4 border-b border-border/50 flex-row items-center">
            <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Mail size={20} color="#6366F1" />
            </View>
            <View>
              <Text className="text-sm text-muted-text font-medium">Email de la cuenta</Text>
              <Text className="text-base text-text font-bold">{user?.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            className="p-4 flex-row items-center justify-between"
            onPress={() => Alert.alert('Info', 'Función próximamente')}
            activeOpacity={0.7}
          >
            <Text className="text-text font-semibold">Cambiar contraseña</Text>
            <ChevronRight size={20} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </Card>

        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} className="mb-6">
            <Text className="text-xs font-semibold text-muted-text mb-3 px-1 uppercase tracking-wide">
              {section.title}
            </Text>
            <Card variant="outlined" className="p-0 overflow-hidden">
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => Alert.alert('Info', 'Función próximamente')}
                  activeOpacity={0.7}
                  className={`flex-row items-center gap-3 p-4 ${idx !== 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                    <item.Icon size={20} color="#6366F1" />
                  </View>
                  <Text className="flex-1 text-text font-medium">{item.label}</Text>
                  <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* ── Sign out ── */}
        <TouchableOpacity
          onPress={onSignOut}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 bg-error/5"
          style={{ borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text className="text-center text-xs text-muted-text mt-6">HabitUp v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}
