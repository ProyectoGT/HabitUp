import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsService } from '@/services/leads.service';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';
import { Screen, Input, Button, Card } from '@/components/ui';
import { ArrowLeft, Tag, FileText, AlignLeft, MapPin, CircleDollarSign, AlertCircle, Clock, Zap } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    { value: 'baja', label: 'Sin prisa', Icon: Clock, color: '#10B981' },
    { value: 'media', label: 'Normal', Icon: AlertCircle, color: '#F59E0B' },
    { value: 'alta', label: 'Urgente', Icon: Zap, color: '#EF4444' },
  ] as const;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen safeArea={false} className="flex-1">
        <View className="bg-surface px-6 pt-16 pb-6 rounded-b-3xl shadow-sm shadow-primary/10 z-10 border-b border-border/50">
          <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center">
            <ArrowLeft size={20} color="#6366F1" />
            <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-text mb-1">Nueva solicitud</Text>
          <Text className="text-muted-text">Describe el trabajo y recibe presupuestos</Text>
        </View>

        <ScrollView contentContainerClassName="px-6 pt-6 pb-24" showsVerticalScrollIndicator={false}>
          
          <Card variant="elevated" className="mb-6 p-5">
            {/* Categoría */}
            <View className="mb-5">
              <Text className="text-sm font-bold text-text mb-2">¿Qué tipo de trabajo necesitas? <Text className="text-error">*</Text></Text>
              <Controller
                control={control}
                name="category_id"
                render={({ field: { onChange } }) => (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                    <View className="flex-row gap-2">
                      {categories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => onChange(cat.id)}
                            className={`px-4 py-2.5 rounded-full border-2 flex-row items-center ${
                              isSelected ? 'bg-primary border-primary' : 'bg-surface border-border'
                            }`}
                          >
                            {isSelected && <Tag size={14} color="#FFF" className="mr-1.5" />}
                            <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-muted-text'}`}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              />
              {errors.category_id && <Text className="text-error text-xs mt-1">{errors.category_id.message}</Text>}
            </View>

            {/* Título */}
            <Controller control={control} name="title" render={({ field: { onChange, value } }) => (
              <Input
                label="Título del trabajo *"
                placeholder="Ej: Reforma completa de baño"
                onChangeText={onChange}
                value={value}
                error={errors.title?.message}
                leftIcon={<FileText size={20} color="#94A3B8" />}
              />
            )} />

            {/* Descripción */}
            <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
              <Input
                label="Descripción detallada *"
                placeholder="Explica qué necesitas: medidas, materiales, plazos..."
                multiline
                numberOfLines={5}
                onChangeText={onChange}
                value={value}
                error={errors.description?.message}
                leftIcon={<AlignLeft size={20} color="#94A3B8" />}
              />
            )} />

            {/* Ciudad */}
            <Controller control={control} name="location_city" render={({ field: { onChange, value } }) => (
              <Input
                label="Ciudad *"
                placeholder="Ej: Madrid"
                onChangeText={onChange}
                value={value}
                error={errors.location_city?.message}
                leftIcon={<MapPin size={20} color="#94A3B8" />}
              />
            )} />

            {/* Presupuesto */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Controller control={control} name="budget_min" render={({ field: { onChange, value } }) => (
                  <Input
                    label="Presupuesto mín. (€)"
                    keyboardType="numeric"
                    placeholder="0"
                    onChangeText={onChange}
                    value={value ? String(value) : ''}
                    error={errors.budget_min?.message}
                    leftIcon={<CircleDollarSign size={20} color="#94A3B8" />}
                  />
                )} />
              </View>
              <View className="flex-1">
                <Controller control={control} name="budget_max" render={({ field: { onChange, value } }) => (
                  <Input
                    label="Presupuesto máx. (€)"
                    keyboardType="numeric"
                    placeholder="0"
                    onChangeText={onChange}
                    value={value ? String(value) : ''}
                    error={errors.budget_max?.message}
                    leftIcon={<CircleDollarSign size={20} color="#94A3B8" />}
                  />
                )} />
              </View>
            </View>

            {/* Urgencia */}
            <View className="mb-4">
              <Text className="text-sm font-bold text-text mb-2">Nivel de urgencia</Text>
              <Controller control={control} name="urgency" render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-3">
                  {URGENCY_OPTIONS.map((opt) => {
                    const isSelected = value === opt.value;
                    const Icon = opt.Icon;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        className={`flex-1 py-4 rounded-2xl border-2 items-center justify-center ${
                          isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
                        }`}
                      >
                        <Icon size={24} color={isSelected ? '#6366F1' : opt.color} />
                        <Text className={`text-xs mt-2 font-bold ${isSelected ? 'text-primary' : 'text-muted-text'}`}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )} />
              {errors.urgency && <Text className="text-error text-xs mt-1">{errors.urgency.message}</Text>}
            </View>

            {errors.root && (
              <Text className="text-error text-sm text-center mb-4 bg-error/10 p-3 rounded-xl">
                {errors.root.message}
              </Text>
            )}

            <Button
              label="Publicar solicitud"
              onPress={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              size="lg"
              className="mt-2 shadow-sm shadow-primary/30"
            />
          </Card>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
