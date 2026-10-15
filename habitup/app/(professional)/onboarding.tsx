import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, type Control, type FieldErrors, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Check, UserRound } from 'lucide-react-native';
import { Button, Input, Screen, StepIndicator } from '@/components/ui';
import { professionalsService } from '@/services/professionals.service';
import { useAuthStore } from '@/stores/authStore';
import type { Category } from '@/types/models';

const schema = z.object({
  company_type: z.enum(['autonomo', 'empresa']),
  company_name: z.string().trim().max(200).optional(),
  description: z.string().trim().min(30, 'Cuéntanos tu experiencia en al menos 30 caracteres').max(1200),
  experience_years: z.number().int().min(0, 'Introduce un valor válido').max(60),
  location_city: z.string().trim().min(2, 'Introduce tu ciudad'),
  location_region: z.string().trim().min(2, 'Introduce tu comunidad autónoma'),
  service_radius_km: z.number().int().min(5, 'El radio mínimo es de 5 km').max(300),
});
type ProfileForm = z.infer<typeof schema>;

export default function ProfessionalOnboardingScreen() {
  const router = useRouter();
  const setProfessionalProfile = useAuthStore((state) => state.setProfessionalProfile);
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [saving, setSaving] = useState(false);
  const { control, trigger, getValues, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { company_type: 'autonomo', company_name: '', description: '', experience_years: 1, location_city: '', location_region: '', service_radius_km: 30 },
  });

  const loadCategories = async () => {
    setLoadingCategories(true); setCategoryError('');
    try { setCategories(await professionalsService.getCategories()); }
    catch { setCategoryError('No hemos podido cargar las especialidades.'); }
    finally { setLoadingCategories(false); }
  };
  useEffect(() => { void loadCategories(); }, []);

  const next = async () => {
    const fields: (keyof ProfileForm)[] = step === 0 ? ['company_type', 'company_name', 'description'] : ['experience_years', 'location_city', 'location_region', 'service_radius_km'];
    if (await trigger(fields)) setStep((value) => value + 1);
  };
  const finish = async () => {
    if (!selected.length) { setCategoryError('Selecciona al menos una especialidad.'); return; }
    setSaving(true); setCategoryError('');
    try {
      const profile = await professionalsService.createProfile(getValues());
      await professionalsService.setCategories(profile.id, selected);
      setProfessionalProfile(profile);
      router.replace('/(professional)/home');
    } catch { setCategoryError('No hemos podido guardar el perfil. Tus datos siguen en pantalla para que puedas intentarlo de nuevo.'); }
    finally { setSaving(false); }
  };

  return <Screen safeArea={false}><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-14 pb-8" showsVerticalScrollIndicator={false}>
    <Text className="text-muted-text font-semibold mb-2">Perfil profesional · {step + 1} de 3</Text>
    <Text className="text-3xl font-bold text-text mb-2">{step === 0 ? 'Presenta tu negocio' : step === 1 ? 'Define dónde trabajas' : 'Elige tus especialidades'}</Text>
    <Text className="text-base text-muted-text leading-6 mb-6">{step === 0 ? 'Esta información ayuda a los clientes a entender quién eres.' : step === 1 ? 'Solo mostraremos una ubicación aproximada en oportunidades públicas.' : 'Selecciona las áreas en las que aceptas nuevos trabajos.'}</Text>
    <StepIndicator total={3} current={step} />
    {step === 0 ? <BusinessStep control={control} errors={errors} /> : null}
    {step === 1 ? <LocationStep control={control} errors={errors} /> : null}
    {step === 2 ? <View><View className="flex-row flex-wrap gap-2">{categories.map((category) => { const checked = selected.includes(category.id); return <Pressable key={category.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => { setSelected((value) => checked ? value.filter((id) => id !== category.id) : [...value, category.id]); setCategoryError(''); }} className={`min-h-12 px-4 rounded-xl border flex-row items-center ${checked ? 'bg-primary border-primary' : 'bg-surface border-border'}`}>{checked ? <Check size={16} color="white" /> : null}<Text className={`font-semibold ${checked ? 'text-white ml-2' : 'text-text'}`}>{category.name}</Text></Pressable>; })}</View>{loadingCategories ? <Text className="text-muted-text mt-4">Cargando especialidades…</Text> : null}{categoryError ? <Text className="text-error mt-4">{categoryError}</Text> : null}{!loadingCategories && !categories.length ? <Button label="Volver a cargar" variant="outline" onPress={loadCategories} className="mt-4" /> : null}</View> : null}
    <View className="flex-row gap-3 mt-8">{step > 0 ? <Button label="Atrás" variant="outline" onPress={() => setStep((value) => value - 1)} className="flex-1" /> : null}<Button label={step === 2 ? 'Guardar perfil' : 'Siguiente'} isLoading={saving} disabled={step === 2 && loadingCategories} onPress={step === 2 ? finish : next} className="flex-1" /></View>
  </ScrollView></KeyboardAvoidingView></Screen>;
}

function BusinessStep({ control, errors }: { control: Control<ProfileForm>; errors: FieldErrors<ProfileForm> }) {
  return <View><Text className="text-sm font-semibold text-text mb-2">Tipo de actividad</Text><Controller control={control} name="company_type" render={({ field: { value, onChange } }) => <View className="flex-row gap-3 mb-6"><Choice label="Autónomo" selected={value === 'autonomo'} Icon={UserRound} onPress={() => onChange('autonomo')} /><Choice label="Empresa" selected={value === 'empresa'} Icon={Building2} onPress={() => onChange('empresa')} /></View>} /><FormField control={control} name="company_name" label="Nombre comercial (opcional)" placeholder="Ej. Reformas García" error={errors.company_name?.message} /><FormField control={control} name="description" label="Experiencia y tipo de trabajos" placeholder="Explica qué trabajos realizas y qué te diferencia" multiline error={errors.description?.message} /></View>;
}
function LocationStep({ control, errors }: { control: Control<ProfileForm>; errors: FieldErrors<ProfileForm> }) {
  return <View><FormField control={control} name="location_city" label="Ciudad" placeholder="Madrid" error={errors.location_city?.message} /><FormField control={control} name="location_region" label="Comunidad autónoma" placeholder="Comunidad de Madrid" error={errors.location_region?.message} /><FormField control={control} name="experience_years" label="Años de experiencia" keyboardType="number-pad" error={errors.experience_years?.message} /><FormField control={control} name="service_radius_km" label="Radio de trabajo en kilómetros" keyboardType="number-pad" error={errors.service_radius_km?.message} /></View>;
}
function FormField({ control, name, error, ...props }: { control: Control<ProfileForm>; name: keyof ProfileForm; error?: string; [key: string]: unknown }) { const numeric = name === 'experience_years' || name === 'service_radius_km'; return <Controller control={control} name={name} render={({ field: { value, onChange, onBlur } }) => <Input value={String(value ?? '')} onChangeText={(text) => onChange(numeric ? Number(text.replace(/\D/g, '')) : text)} onBlur={onBlur} error={error} {...props} />} />; }
function Choice({ label, selected, Icon, onPress }: { label: string; selected: boolean; Icon: typeof UserRound; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} className={`flex-1 min-h-16 rounded-xl border px-4 flex-row items-center ${selected ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}><Icon size={20} color={selected ? '#4F46E5' : '#475569'} /><Text className={`font-semibold ml-2 ${selected ? 'text-primary' : 'text-text'}`}>{label}</Text></Pressable>; }
