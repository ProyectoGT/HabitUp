import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, type Resolver, type Control, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { professionalsService } from '@/services/professionals.service';
import { useAuthStore } from '@/stores/authStore';
import { Screen, Input, Button, Card, StepIndicator } from '@/components/ui';
import { Briefcase, Building2, MapPin, Map, MapPinHouse, Award, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react-native';
import type { Category } from '@/types/models';
import { useColorScheme } from 'nativewind';

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
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <Screen safeArea={false} className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="px-6 pt-16 pb-10" showsVerticalScrollIndicator={false}>
          <Text className="text-3xl font-extrabold text-text mb-2">Crea tu perfil</Text>
          <Text className="text-muted-text text-base mb-8 leading-relaxed">
            {step === 0 ? 'Completa los datos de tu negocio para empezar a recibir presupuestos.' : '¿Cuáles son tus especialidades principales?'}
          </Text>

          <View className="mb-8">
            <StepIndicator total={2} current={step} />
          </View>

          {step === 0 ? (
            <Step1Form control={control} errors={errors} onSubmit={handleSubmit(onStep1Submit)} isDark={isDark} />
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
    </Screen>
  );
}

// ── Sub-componente Step1 ───────────────────────────
function Step1Form({
  control, errors, onSubmit, isDark
}: {
  control: Control<Step1Data>;
  errors: FieldErrors<Step1Data>;
  onSubmit: () => void;
  isDark: boolean;
}) {
  return (
    <View className="gap-6">
      {/* Tipo de empresa */}
      <View>
        <Text className="text-sm font-bold text-text mb-3">Tipo de empresa</Text>
        <Controller
          control={control}
          name="company_type"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-4 mb-2">
              {(['autonomo', 'empresa'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.7}
                  onPress={() => onChange(t)}
                  className={`flex-1 py-4 rounded-2xl border-2 items-center flex-row justify-center gap-2 ${
                    value === t 
                      ? 'bg-primary/5 border-primary' 
                      : 'bg-surface border-border'
                  }`}
                >
                  {t === 'autonomo' ? (
                    <Briefcase size={20} color={value === t ? '#6366F1' : (isDark ? '#94A3B8' : '#64748B')} />
                  ) : (
                    <Building2 size={20} color={value === t ? '#6366F1' : (isDark ? '#94A3B8' : '#64748B')} />
                  )}
                  <Text className={`font-bold ${value === t ? 'text-primary' : 'text-muted-text'}`}>
                    {t === 'autonomo' ? 'Autónomo' : 'Empresa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="company_name"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Nombre de empresa (opcional)"
            placeholder="Ej: Reformas García S.L."
            onChangeText={onChange}
            value={value}
            leftIcon={<Building2 size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Descripción *"
            placeholder="Cuéntanos tu experiencia, qué trabajos realizas..."
            multiline
            numberOfLines={4}
            onChangeText={onChange}
            value={value}
            error={errors.description?.message}
          />
        )}
      />

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Controller
            control={control}
            name="experience_years"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Años de experiencia *"
                keyboardType="numeric"
                onChangeText={onChange}
                value={String(value ?? '')}
                error={errors.experience_years?.message}
                leftIcon={<Award size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="service_radius_km"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Radio de trabajo (km) *"
                keyboardType="numeric"
                onChangeText={onChange}
                value={String(value ?? '')}
                error={errors.service_radius_km?.message}
                leftIcon={<MapPinHouse size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="location_city"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Ciudad *"
            placeholder="Ej: Madrid"
            onChangeText={onChange}
            value={value}
            error={errors.location_city?.message}
            leftIcon={<MapPin size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
          />
        )}
      />

      <Controller
        control={control}
        name="location_region"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Comunidad autónoma *"
            placeholder="Ej: Comunidad de Madrid"
            onChangeText={onChange}
            value={value}
            error={errors.location_region?.message}
            leftIcon={<Map size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
          />
        )}
      />

      <Button 
        label="Siguiente paso" 
        onPress={onSubmit} 
        size="lg"
        rightIcon={<ArrowRight size={20} color="#FFF" />}
        className="mt-4 shadow-sm shadow-primary/30"
      />
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
    <View className="flex-1">
      <Card variant="flat" className="bg-primary/5 border border-primary/20 p-4 mb-6">
        <Text className="text-primary font-bold text-sm mb-1">Nota importante</Text>
        <Text className="text-muted-text text-sm leading-relaxed">
          Selecciona todas las que apliquen. La primera categoría seleccionada será configurada como tu especialidad principal.
        </Text>
      </Card>

      <View className="flex-row flex-wrap gap-3 mb-8">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => onToggle(cat.id)}
              className={`px-5 py-3 rounded-full border-2 flex-row items-center gap-2 ${
                isSelected 
                  ? 'bg-primary border-primary' 
                  : 'bg-surface border-border/60'
              }`}
            >
              {isSelected && <CheckCircle2 size={16} color="#FFF" />}
              <Text className={`font-bold ${isSelected ? 'text-white' : 'text-text'}`}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <Text className="text-error text-sm text-center mb-6 bg-error/10 p-3 rounded-xl">
          {error}
        </Text>
      ) : null}

      <View className="flex-row gap-4 mt-auto pt-4 border-t border-border/30">
        <Button 
          label="Atrás" 
          variant="outline" 
          onPress={onBack}
          leftIcon={<ArrowLeft size={20} color="#6366F1" />}
          className="flex-1"
        />
        <Button 
          label="Finalizar" 
          onPress={onFinish}
          isLoading={isSubmitting}
          className="flex-1 shadow-sm shadow-primary/30"
          rightIcon={<CheckCircle2 size={20} color="#FFF" />}
        />
      </View>
    </View>
  );
}
