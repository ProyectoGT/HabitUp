import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, type Resolver, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { professionalsService } from '@/services/professionals.service';
import { useAuthStore } from '@/stores/authStore';
import { StepIndicator } from '@/components/ui';
import type { Category } from '@/types/models';
import { useEffect } from 'react';

// ── Step 1 schema ─────────────────────────────────
const step1Schema = z.object({
  company_type: z.enum(['autonomo', 'empresa']),
  company_name: z.string().optional(),
  description: z.string().min(30, 'Mínimo 30 caracteres. Cuéntanos tu experiencia'),
  experience_years: z.coerce.number().int().min(0).max(60),
  location_city: z.string().min(2, 'Indica tu ciudad'),
  location_region: z.string().min(2, 'Indica tu comunidad autónoma'),
  service_radius_km: z.coerce.number().int().min(5).max(500),
});

type Step1Data = z.infer<typeof step1Schema>;

export default function OnboardingScreen() {
  const router = useRouter();
  const setProfessionalProfile = useAuthStore((s) => s.setProfessionalProfile);

  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema) as Resolver<Step1Data>,
    defaultValues: {
      company_type: 'autonomo',
      service_radius_km: 50,
      experience_years: 1,
    },
  });

  useEffect(() => {
    professionalsService.getCategories().then(setCategories);
  }, []);

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(1);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setCategoriesError('');
  };

  const onFinish = async () => {
    if (selectedCategoryIds.length === 0) {
      setCategoriesError('Selecciona al menos una especialidad');
      return;
    }
    if (!step1Data) return;

    setIsSubmitting(true);
    try {
      const profile = await professionalsService.createProfile(step1Data);
      await professionalsService.setCategories(profile.id, selectedCategoryIds);
      setProfessionalProfile(profile);
      router.replace('/(professional)/home');
    } catch (e) {
      setCategoriesError(e instanceof Error ? e.message : 'Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-6 pt-14 pb-10">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Crea tu perfil profesional</Text>
        <Text className="text-gray-500 mb-6">
          {step === 0 ? 'Datos básicos de tu negocio' : 'Elige tus especialidades'}
        </Text>

        <StepIndicator total={2} current={step} />

        {step === 0 ? (
          <Step1Form control={control} errors={errors} onSubmit={handleSubmit(onStep1Submit)} />
        ) : (
          <Step2Categories
            categories={categories}
            selected={selectedCategoryIds}
            onToggle={toggleCategory}
            error={categoriesError}
            isSubmitting={isSubmitting}
            onBack={() => setStep(0)}
            onFinish={onFinish}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-componente Step1 ───────────────────────────
function Step1Form({
  control, errors, onSubmit,
}: {
  control: Control<Step1Data>;
  errors: FieldErrors<Step1Data>;
  onSubmit: () => void;
}) {
  return (
    <View>
      {/* Tipo de empresa */}
      <Text className="text-sm font-medium text-gray-700 mb-2">Tipo de empresa</Text>
      <Controller
        control={control}
        name="company_type"
        render={({ field: { onChange, value } }) => (
          <View className="flex-row gap-3 mb-4">
            {(['autonomo', 'empresa'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => onChange(t)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  value === t ? 'bg-brand border-brand' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={value === t ? 'text-white font-semibold' : 'text-gray-600'}>
                  {t === 'autonomo' ? 'Autónomo' : 'Empresa'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <Field label="Nombre de empresa (opcional)">
        <Controller
          control={control}
          name="company_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Ej: Reformas García S.L."
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </Field>

      <Field label="Descripción *" error={errors.description?.message}>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Cuéntanos tu experiencia, qué trabajos realizas..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Años de experiencia *" error={errors.experience_years?.message}>
            <Controller
              control={control}
              name="experience_years"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  onChangeText={onChange}
                  value={String(value ?? '')}
                />
              )}
            />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Radio de trabajo (km) *" error={errors.service_radius_km?.message}>
            <Controller
              control={control}
              name="service_radius_km"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  onChangeText={onChange}
                  value={String(value ?? '')}
                />
              )}
            />
          </Field>
        </View>
      </View>

      <Field label="Ciudad *" error={errors.location_city?.message}>
        <Controller
          control={control}
          name="location_city"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Ej: Madrid"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </Field>

      <Field label="Comunidad autónoma *" error={errors.location_region?.message}>
        <Controller
          control={control}
          name="location_region"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Ej: Comunidad de Madrid"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </Field>

      <TouchableOpacity onPress={onSubmit} className="bg-brand py-4 rounded-xl items-center mt-4">
        <Text className="text-white font-semibold text-base">Siguiente →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Sub-componente Step2 ───────────────────────────
function Step2Categories({
  categories, selected, onToggle, error, isSubmitting, onBack, onFinish,
}: {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  error: string;
  isSubmitting: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <View>
      <Text className="text-sm text-gray-500 mb-4">Selecciona todas las que apliquen. La primera será tu especialidad principal.</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onToggle(cat.id)}
              className={`px-4 py-2 rounded-full border ${
                isSelected ? 'bg-brand border-brand' : 'bg-white border-gray-300'
              }`}
            >
              <Text className={isSelected ? 'text-white font-medium' : 'text-gray-700'}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text className="text-red-500 text-sm mb-3">{error}</Text> : null}

      <View className="flex-row gap-3 mt-2">
        <TouchableOpacity onPress={onBack} className="flex-1 py-4 rounded-xl border border-gray-300 items-center">
          <Text className="text-gray-700 font-semibold">← Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onFinish}
          disabled={isSubmitting}
          className="flex-1 bg-brand py-4 rounded-xl items-center"
        >
          {isSubmitting
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-semibold text-base">Finalizar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helper UI ─────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      {children}
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
