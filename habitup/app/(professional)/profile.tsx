import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
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
      // Guardar account_id en store si es nuevo
      if (professionalProfile && !professionalProfile.stripe_account_id) {
        setProfessionalProfile({ ...professionalProfile, stripe_account_id: account_id });
      }
      await WebBrowser.openBrowserAsync(url);
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
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-6 pt-14 pb-10">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Mi perfil profesional</Text>

      {/* Datos personales */}
      <SectionCard title="Datos personales">
        <Field label="Nombre completo" error={errors.full_name?.message}>
          <Controller control={control} name="full_name" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" onChangeText={onChange} value={value} />
          )} />
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" keyboardType="phone-pad" onChangeText={onChange} value={value ?? ''} />
          )} />
        </Field>
      </SectionCard>

      {/* Descripción */}
      <SectionCard title="Descripción del negocio">
        <Field label="Descripción *" error={errors.description?.message}>
          <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" multiline numberOfLines={4} textAlignVertical="top" onChangeText={onChange} value={value} />
          )} />
        </Field>
      </SectionCard>

      {/* Localización */}
      <SectionCard title="Localización">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Ciudad *" error={errors.location_city?.message}>
              <Controller control={control} name="location_city" render={({ field: { onChange, value } }) => (
                <TextInput className="border border-gray-200 rounded-lg px-4 py-3" onChangeText={onChange} value={value} />
              )} />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Radio (km) *" error={errors.service_radius_km?.message}>
              <Controller control={control} name="service_radius_km" render={({ field: { onChange, value } }) => (
                <TextInput className="border border-gray-200 rounded-lg px-4 py-3" keyboardType="numeric" onChangeText={onChange} value={String(value ?? '')} />
              )} />
            </Field>
          </View>
        </View>
        <Field label="Comunidad autónoma *" error={errors.location_region?.message}>
          <Controller control={control} name="location_region" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" onChangeText={onChange} value={value} />
          )} />
        </Field>
      </SectionCard>

      {/* Especialidades */}
      <SectionCard title="Especialidades">
        <View className="flex-row flex-wrap gap-2">
          {allCategories.map((cat) => {
            const sel = selectedCategoryIds.includes(cat.id);
            return (
              <TouchableOpacity key={cat.id} onPress={() => toggleCategory(cat.id)}
                className={`px-4 py-2 rounded-full border ${sel ? 'bg-brand border-brand' : 'bg-white border-gray-300'}`}
              >
                <Text className={sel ? 'text-white font-medium' : 'text-gray-700'}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      {/* Redes sociales */}
      <SectionCard title="Web y redes sociales">
        <Field label="Página web" error={errors.website_url?.message}>
          <Controller control={control} name="website_url" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" placeholder="https://tuweb.com" autoCapitalize="none" keyboardType="url" onChangeText={onChange} value={value ?? ''} />
          )} />
        </Field>
        <Field label="Instagram" error={errors.instagram_url?.message}>
          <Controller control={control} name="instagram_url" render={({ field: { onChange, value } }) => (
            <TextInput className="border border-gray-200 rounded-lg px-4 py-3" placeholder="https://instagram.com/tu_perfil" autoCapitalize="none" keyboardType="url" onChangeText={onChange} value={value ?? ''} />
          )} />
        </Field>
      </SectionCard>

      {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

      <TouchableOpacity
        onPress={handleSubmit(onSave)}
        disabled={isSubmitting}
        className="bg-brand py-4 rounded-xl items-center mb-4"
      >
        {isSubmitting
          ? <ActivityIndicator color="white" />
          : <Text className="text-white font-semibold text-base">Guardar cambios</Text>}
      </TouchableOpacity>

      {/* Stripe Connect */}
      <SectionCard title="Cuenta de cobros">
        {professionalProfile?.stripe_account_enabled ? (
          <View className="flex-row items-center gap-3 bg-green-50 p-3 rounded-xl">
            <Text className="text-2xl">✅</Text>
            <View>
              <Text className="font-semibold text-green-700">Cuenta verificada</Text>
              <Text className="text-xs text-green-600">Recibirás el 90% de cada pago automáticamente</Text>
            </View>
          </View>
        ) : (
          <>
            <Text className="text-sm text-gray-500 mb-3">
              Conecta tu cuenta bancaria para recibir pagos a través de HabitUp. El proceso tarda menos de 5 minutos.
            </Text>
            <TouchableOpacity
              onPress={onConnectStripe}
              disabled={connectLoading}
              className="bg-[#635BFF] py-3 rounded-xl items-center flex-row justify-center gap-2"
            >
              {connectLoading
                ? <ActivityIndicator color="white" />
                : <>
                    <Text className="text-white text-lg">⚡</Text>
                    <Text className="text-white font-semibold">
                      {professionalProfile?.stripe_account_id ? 'Continuar verificación' : 'Conectar con Stripe'}
                    </Text>
                  </>}
            </TouchableOpacity>
          </>
        )}
      </SectionCard>

      <TouchableOpacity onPress={onSignOut} className="border border-red-400 py-3 rounded-xl items-center mt-2">
        <Text className="text-red-500 font-semibold">Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
      <Text className="text-base font-semibold text-gray-900 mb-4">{title}</Text>
      {children}
    </View>
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
