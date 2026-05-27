import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { professionalsService } from '@/services/professionals.service';
import { paymentsService } from '@/services/payments.service';
import { supabase } from '@/services/supabase';
import type { Category } from '@/types/models';
import { Screen, Card, Button, Input, Badge } from '@/components/ui';
import { Save, LogOut, CheckCircle2, XCircle, Clock, AlertTriangle, Link as LinkIcon, Camera, Globe, MapPin, Map, User, Phone, Briefcase, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const schema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  phone: z.string().optional(),
  description: z.string().min(10, 'Descripción demasiado corta'),
  location_city: z.string().min(2, 'Ciudad requerida'),
  location_region: z.string().min(2, 'Comunidad requerida'),
  service_radius_km: z.coerce.number().int().min(5).max(500),
  website_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function ProfessionalProfileScreen() {
  const router = useRouter();
  const { user, professionalProfile, reset, setProfessionalProfile } = useAuthStore();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    professionalsService.getCategories().then(setAllCategories);
    if (professionalProfile) {
      professionalsService
        .getMyCategories(professionalProfile.id)
        .then((cats) => setSelectedCategoryIds(cats.map((c) => c.id)));
    }
  }, []);

  const { control, handleSubmit, formState: { errors, isSubmitting, isDirty }, setError } =
    useForm<FormData>({
      resolver: zodResolver(schema) as Resolver<FormData>,
      defaultValues: {
        full_name: user?.full_name ?? '',
        phone: user?.phone ?? '',
        description: professionalProfile?.description ?? '',
        location_city: professionalProfile?.location_city ?? '',
        location_region: professionalProfile?.location_region ?? '',
        service_radius_km: professionalProfile?.service_radius_km ?? 50,
        website_url: professionalProfile?.website_url ?? '',
        instagram_url: professionalProfile?.instagram_url ?? '',
      },
    });

  const onSave = async (data: FormData) => {
    try {
      const { full_name, phone, ...profileData } = data;

      await supabase.from('users').update({ full_name, phone }).eq('id', user!.id);

      const updated = await professionalsService.updateProfile(profileData);
      setProfessionalProfile(updated);

      if (professionalProfile) {
        await professionalsService.setCategories(professionalProfile.id, selectedCategoryIds);
      }

      Alert.alert('Guardado', 'Perfil actualizado correctamente');
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Error al guardar' });
    }
  };

  const [connectLoading, setConnectLoading] = useState(false);

  const onConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const { url, account_id } = await paymentsService.createConnectAccountLink();
      if (professionalProfile && !professionalProfile.stripe_account_id) {
        setProfessionalProfile({ ...professionalProfile, stripe_account_id: account_id });
      }
      await WebBrowser.openBrowserAsync(url);
      // Esperar a que Stripe procese y envíe webhook antes de recargar
      await new Promise(r => setTimeout(r, 2000));
      const updated = await professionalsService.getMyProfile();
      if (updated) setProfessionalProfile(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al conectar con Stripe');
    } finally {
      setConnectLoading(false);
    }
  };

  const onSignOut = () => {
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

  const toggleCategory = (id: string) =>
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-text leading-tight">Mi perfil profesional</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-24" showsVerticalScrollIndicator={false}>

        {/* Datos personales */}
        <SectionCard title="Datos personales" icon={<User size={20} color="#6366F1" />}>
          <Controller control={control} name="full_name" render={({ field: { onChange, value } }) => (
            <Input 
              label="Nombre completo" 
              onChangeText={onChange} 
              value={value} 
              error={errors.full_name?.message} 
              className="mb-4"
              leftIcon={<User size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            />
          )} />
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <Input 
              label="Teléfono" 
              keyboardType="phone-pad" 
              onChangeText={onChange} 
              value={value ?? ''} 
              error={errors.phone?.message}
              leftIcon={<Phone size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            />
          )} />
        </SectionCard>

        {/* Descripción */}
        <SectionCard title="Descripción del negocio" icon={<Briefcase size={20} color="#6366F1" />}>
          <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
            <Input 
              label="Descripción *" 
              multiline 
              numberOfLines={4} 
              onChangeText={onChange} 
              value={value} 
              error={errors.description?.message} 
            />
          )} />
        </SectionCard>

        {/* Localización */}
        <SectionCard title="Localización" icon={<MapPin size={20} color="#6366F1" />}>
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Controller control={control} name="location_city" render={({ field: { onChange, value } }) => (
                <Input 
                  label="Ciudad *" 
                  onChangeText={onChange} 
                  value={value} 
                  error={errors.location_city?.message} 
                  leftIcon={<MapPin size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
                />
              )} />
            </View>
            <View className="flex-1">
              <Controller control={control} name="service_radius_km" render={({ field: { onChange, value } }) => (
                <Input 
                  label="Radio (km) *" 
                  keyboardType="numeric" 
                  onChangeText={onChange} 
                  value={String(value ?? '')} 
                  error={errors.service_radius_km?.message} 
                />
              )} />
            </View>
          </View>
          <Controller control={control} name="location_region" render={({ field: { onChange, value } }) => (
            <Input 
              label="Comunidad autónoma *" 
              onChangeText={onChange} 
              value={value} 
              error={errors.location_region?.message} 
              leftIcon={<Map size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            />
          )} />
        </SectionCard>

        {/* Especialidades */}
        <SectionCard title="Especialidades" icon={<CheckCircle2 size={20} color="#6366F1" />}>
          <View className="flex-row flex-wrap gap-2">
            {allCategories.map((cat) => {
              const sel = selectedCategoryIds.includes(cat.id);
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.7}
                  className={`px-4 py-2 rounded-full border ${
                    sel 
                      ? 'bg-primary border-primary' 
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text className={`font-medium ${sel ? 'text-white' : 'text-text'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* Redes sociales */}
        <SectionCard title="Web y redes sociales" icon={<LinkIcon size={20} color="#6366F1" />}>
          <Controller control={control} name="website_url" render={({ field: { onChange, value } }) => (
            <Input 
              label="Página web" 
              placeholder="https://tuweb.com" 
              autoCapitalize="none" 
              keyboardType="url" 
              onChangeText={onChange} 
              value={value ?? ''} 
              error={errors.website_url?.message} 
              className="mb-4"
              leftIcon={<Globe size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            />
          )} />
          <Controller control={control} name="instagram_url" render={({ field: { onChange, value } }) => (
            <Input 
              label="Instagram" 
              placeholder="https://instagram.com/tu_perfil" 
              autoCapitalize="none" 
              keyboardType="url" 
              onChangeText={onChange} 
              value={value ?? ''} 
              error={errors.instagram_url?.message} 
              leftIcon={<Camera size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            />
          )} />
        </SectionCard>

        {errors.root && (
          <Text className="text-error text-sm text-center mb-4 bg-error/10 p-3 rounded-xl">
            {errors.root.message}
          </Text>
        )}

        <Button
          label="Guardar cambios"
          onPress={handleSubmit(onSave)}
          isLoading={isSubmitting}
          leftIcon={<Save size={20} color="#FFF" />}
          size="lg"
          className="mb-6 shadow-sm shadow-primary/30"
        />

        {/* Stripe Connect — 5 estados */}
        <SectionCard title="Cuenta de cobros" icon={<Zap size={20} color="#6366F1" />}>
          {(() => {
            const status = (professionalProfile?.stripe_account_status ?? 'not_created') as
              'not_created' | 'pending' | 'active' | 'restricted' | 'disabled';
            const hasAccount = !!professionalProfile?.stripe_account_id;

            const CONFIG: Record<string, {
              icon: React.ComponentType<{ size?: number; color?: string }>;
              title: string;
              message: string;
              bg: string;
              border: string;
              iconBg: string;
              iconColor: string;
              titleColor: string;
              textColor: string;
              buttonLabel: string | null;
            }> = {
              not_created: {
                icon: Zap,
                title: 'Configurar cobros',
                message: 'Conecta tu cuenta bancaria para recibir pagos a través de HabitUp. El proceso es seguro y guiado.',
                bg: 'bg-border/20', border: 'border-border/30', iconBg: 'bg-surface',
                iconColor: isDark ? '#94A3B8' : '#64748B', titleColor: 'text-text', textColor: 'text-muted-text',
                buttonLabel: 'Conectar con Stripe',
              },
              pending: {
                icon: Clock,
                title: 'Verificación pendiente',
                message: 'Stripe está procesando tu información. Completa los pasos pendientes para activar los cobros.',
                bg: 'bg-warning/10', border: 'border-warning/30', iconBg: 'bg-warning/20',
                iconColor: '#F59E0B', titleColor: 'text-warning', textColor: 'text-warning/80',
                buttonLabel: 'Continuar verificación',
              },
              restricted: {
                icon: AlertTriangle,
                title: 'Requisitos pendientes',
                message: 'Stripe necesita información adicional para mantener tu cuenta activa. Revisa los requisitos pendientes.',
                bg: 'bg-error/10', border: 'border-error/30', iconBg: 'bg-error/20',
                iconColor: '#EF4444', titleColor: 'text-error', textColor: 'text-error/80',
                buttonLabel: 'Revisar requisitos',
              },
              active: {
                icon: CheckCircle2,
                title: 'Cuenta activa',
                message: 'Puedes recibir pagos automáticamente. Recibirás el importe acordado tras la comisión de HabitUp.',
                bg: 'bg-success/10', border: 'border-success/20', iconBg: 'bg-success/20',
                iconColor: '#10B981', titleColor: 'text-success', textColor: 'text-success/80',
                buttonLabel: null,
              },
              disabled: {
                icon: XCircle,
                title: 'Cuenta deshabilitada',
                message: 'Tu cuenta de cobros ha sido deshabilitada. Contacta con soporte para resolverlo.',
                bg: 'bg-error/10', border: 'border-error/30', iconBg: 'bg-error/20',
                iconColor: '#EF4444', titleColor: 'text-error', textColor: 'text-error/80',
                buttonLabel: null,
              },
            };

            const cfg = CONFIG[status] ?? CONFIG.not_created;
            const Icon = cfg.icon;

            return (
              <>
                <View className={`flex-row items-center gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <View className={`w-12 h-12 ${cfg.iconBg} rounded-full items-center justify-center shadow-sm`}>
                    <Icon size={24} color={cfg.iconColor} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-base mb-0.5 ${cfg.titleColor}`}>{cfg.title}</Text>
                    <Text className={`text-sm font-medium leading-tight ${cfg.textColor}`}>
                      {cfg.message}
                    </Text>
                  </View>
                </View>
                {cfg.buttonLabel && (
                  <Button
                    label={cfg.buttonLabel}
                    onPress={onConnectStripe}
                    isLoading={connectLoading}
                    leftIcon={<Zap size={20} color="#FFF" />}
                    style={{ backgroundColor: '#635BFF' }}
                    className="mt-4 shadow-sm shadow-primary/30"
                  />
                )}
                {status === 'active' && hasAccount && (
                  <Text className="text-xs text-muted-text text-center mt-3">
                    ID de cuenta: {professionalProfile?.stripe_account_id?.slice(0, 12)}...
                  </Text>
                )}
              </>
            );
          })()}
        </SectionCard>

        <Button
          label="Cerrar sesión"
          variant="outline"
          onPress={onSignOut}
          leftIcon={<LogOut size={20} color="#EF4444" />}
          className="mt-4 border-error/50"
          textClassName="text-error"
        />
      </ScrollView>
    </Screen>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card variant="elevated" className="p-5 mb-6">
      <View className="flex-row items-center mb-5 border-b border-border/50 pb-3">
        {icon && <View className="mr-2">{icon}</View>}
        <Text className="text-lg font-bold text-text">{title}</Text>
      </View>
      {children}
    </Card>
  );
}
