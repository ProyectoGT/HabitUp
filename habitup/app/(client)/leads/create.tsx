import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsService } from '@/services/leads.service';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';

const schema = z.object({
  category_id: z.string().min(1, 'Selecciona una categoría'),
  title: z.string().min(5, 'Título demasiado corto').max(120),
  description: z.string().min(20, 'Describe el trabajo con más detalle'),
  location_city: z.string().min(2, 'Indica la ciudad'),
  budget_min: z.coerce.number().positive().optional(),
  budget_max: z.coerce.number().positive().optional(),
  urgency: z.enum(['baja', 'media', 'alta']),
  preferred_start_date: z.string().optional(),
}).refine(
  (d) => !d.budget_min || !d.budget_max || d.budget_max >= d.budget_min,
  { message: 'El presupuesto máximo debe ser mayor al mínimo', path: ['budget_max'] },
);

type FormData = z.infer<typeof schema>;

export default function CreateLeadScreen() {
  const router = useRouter();
  const { professionalId } = useLocalSearchParams<{ professionalId?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    professionalsService.getCategories().then(setCategories);
  }, []);

  const { control, handleSubmit, watch, formState: { errors, isSubmitting }, setError } =
    useForm<FormData>({
      resolver: zodResolver(schema) as Resolver<FormData>,
      defaultValues: { urgency: 'media' },
    });

  const selectedCategoryId = watch('category_id');

  const onSubmit = async (data: FormData) => {
    try {
      await leadsService.create(data);
      router.replace('/(client)/leads');
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Error al crear la solicitud' });
    }
  };

  const URGENCY_OPTIONS = [
    { value: 'baja', label: 'Sin prisa', emoji: '🟢' },
    { value: 'media', label: 'Normal', emoji: '🟡' },
    { value: 'alta', label: 'Urgente', emoji: '🔴' },
  ] as const;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-5 pt-14 pb-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-brand text-base">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-1">Nueva solicitud</Text>
        <Text className="text-gray-500 mb-6">Describe el trabajo y recibe presupuestos</Text>

        {/* Categoría */}
        <Field label="¿Qué tipo de trabajo necesitas? *" error={errors.category_id?.message}>
          <Controller
            control={control}
            name="category_id"
            render={({ field: { onChange } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 py-1">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => onChange(cat.id)}
                      className={`px-4 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-brand border-brand' : 'bg-white border-gray-300'}`}
                    >
                      <Text className={selectedCategoryId === cat.id ? 'text-white font-medium' : 'text-gray-700'}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          />
        </Field>

        {/* Título */}
        <Field label="Título *" error={errors.title?.message}>
          <Controller control={control} name="title" render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Ej: Reforma completa de baño"
              onChangeText={onChange}
              value={value}
            />
          )} />
        </Field>

        {/* Descripción */}
        <Field label="Descripción *" error={errors.description?.message}>
          <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Explica qué necesitas: medidas, materiales, plazos..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              onChangeText={onChange}
              value={value}
            />
          )} />
        </Field>

        {/* Ciudad */}
        <Field label="Ciudad *" error={errors.location_city?.message}>
          <Controller control={control} name="location_city" render={({ field: { onChange, value } }) => (
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Ej: Madrid"
              onChangeText={onChange}
              value={value}
            />
          )} />
        </Field>

        {/* Presupuesto */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Presupuesto mín. (€)" error={errors.budget_min?.message}>
              <Controller control={control} name="budget_min" render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  placeholder="0"
                  onChangeText={onChange}
                  value={value ? String(value) : ''}
                />
              )} />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Presupuesto máx. (€)" error={errors.budget_max?.message}>
              <Controller control={control} name="budget_max" render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  placeholder="0"
                  onChangeText={onChange}
                  value={value ? String(value) : ''}
                />
              )} />
            </Field>
          </View>
        </View>

        {/* Urgencia */}
        <Field label="Urgencia" error={errors.urgency?.message}>
          <Controller control={control} name="urgency" render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  className={`flex-1 py-3 rounded-xl border items-center ${value === opt.value ? 'bg-brand border-brand' : 'bg-white border-gray-300'}`}
                >
                  <Text>{opt.emoji}</Text>
                  <Text className={`text-xs mt-0.5 ${value === opt.value ? 'text-white font-medium' : 'text-gray-600'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )} />
        </Field>

        {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="bg-brand py-4 rounded-xl items-center mt-2"
        >
          {isSubmitting
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-semibold text-base">Publicar solicitud</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
