import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { portfolioService } from '@/services/portfolio.service';
import { storageService } from '@/services/storage.service';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';
import { Screen, Input, Button } from '@/components/ui';
import { ArrowLeft, ImagePlus, X, Upload } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  client_location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AddPortfolioItemScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    professionalsService.getCategories().then(setCategories);
  }, []);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    if (photos.length === 0) {
      Alert.alert('Fotos requeridas', 'Selecciona al menos una foto del trabajo.');
      return;
    }

    setIsUploading(true);
    try {
      const item = await portfolioService.create({
        title: data.title,
        description: data.description || undefined,
        category_id: selectedCategoryId || undefined,
        client_location: data.client_location || undefined,
      });

      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadPhoto(photo, item.id);
        uploadedUrls.push(url);
      }

      await portfolioService.updatePhotos(item.id, uploadedUrls);

      Alert.alert('Trabajo publicado', 'Tu trabajo se ha añadido al portfolio.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al publicar');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadPhoto = async (photo: ImagePicker.ImagePickerAsset, itemId: string): Promise<string> => {
    const upload = await storageService.upload('portfolio-images', itemId, {
      uri: photo.uri,
      contentType: photo.mimeType ?? 'image/jpeg',
      name: photo.fileName ?? `${itemId}.jpg`,
      size: photo.fileSize ?? 0,
    });

    if (!upload.publicUrl) throw new Error('No se pudo obtener la URL publica de la foto');
    return upload.publicUrl;
  };

  return (
    <Screen safeArea={false} className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
          <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
            <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
              <ArrowLeft size={20} color="#6366F1" />
              <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
            </TouchableOpacity>
            <Text className="text-2xl font-extrabold text-text leading-tight mb-1">Añadir trabajo</Text>
            <Text className="text-muted-text text-sm font-medium">Sube fotos de tus mejores proyectos</Text>
          </View>

          <View className="px-6 pt-6 gap-6">
            {/* Fotos */}
            <View>
              <Text className="text-sm font-bold text-text mb-3">Fotos del trabajo *</Text>
              <View className="flex-row flex-wrap gap-3">
                {photos.map((photo, idx) => (
                  <View key={idx} className="relative">
                    <Image source={{ uri: photo.uri }} className="w-24 h-24 rounded-xl" resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-error rounded-full items-center justify-center shadow-sm"
                    >
                      <X size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 10 && (
                  <TouchableOpacity
                    onPress={pickPhotos}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-border items-center justify-center bg-surface-active"
                  >
                    <ImagePlus size={28} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text className="text-[10px] text-muted-text font-medium mt-1">Añadir</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text className="text-xs text-muted-text mt-2">{photos.length}/10 fotos seleccionadas</Text>
            </View>

            {/* Título */}
            <Controller control={control} name="title" render={({ field: { onChange, value } }) => (
              <Input
                label="Título del trabajo *"
                placeholder="Ej: Reforma integral de baño"
                onChangeText={onChange}
                value={value}
                error={errors.title?.message}
              />
            )} />

            {/* Descripción */}
            <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
              <Input
                label="Descripción"
                placeholder="Describe el trabajo realizado, materiales usados..."
                multiline
                numberOfLines={3}
                onChangeText={onChange}
                value={value}
                error={errors.description?.message}
              />
            )} />

            {/* Categoría */}
            <View>
              <Text className="text-sm font-bold text-text mb-3">Categoría</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                      activeOpacity={0.7}
                      className={`px-4 py-2 rounded-full border ${
                        isSelected ? 'bg-primary border-primary' : 'bg-surface border-border'
                      }`}
                    >
                      <Text className={`font-medium ${isSelected ? 'text-white' : 'text-text'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ubicación del cliente */}
            <Controller control={control} name="client_location" render={({ field: { onChange, value } }) => (
              <Input
                label="Ubicación del cliente"
                placeholder="Ej: Madrid, Chamberí"
                onChangeText={onChange}
                value={value}
                error={errors.client_location?.message}
              />
            )} />

            <Button
              label={isUploading ? 'Subiendo fotos...' : 'Publicar trabajo'}
              onPress={handleSubmit(onSubmit)}
              isLoading={isSubmitting || isUploading}
              leftIcon={isUploading ? undefined : <Upload size={20} color="#FFF" />}
              size="lg"
              className="shadow-sm shadow-primary/30"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
