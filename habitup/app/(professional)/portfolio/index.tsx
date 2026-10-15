import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { portfolioService } from '@/services/portfolio.service';
import type { PortfolioItem } from '@/types/models';
import { Screen, Button, Badge, LoadingState, EmptyState } from '@/components/ui';
import { Image as ImageIcon, Plus, ArrowLeft, Trash2, Calendar, MapPin } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function PortfolioScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await portfolioService.getMyItems();
      setItems(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (item: PortfolioItem) => {
    Alert.alert(
      'Eliminar trabajo',
      `¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await portfolioService.delete(item.id);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el trabajo');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={24} color="#6366F1" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-text">Mi portfolio</Text>
        </View>
        <Button
          label="Añadir"
          onPress={() => router.push('/(professional)/portfolio/add')}
          size="sm"
          leftIcon={<Plus size={16} color="#FFF" />}
          className="shadow-sm shadow-primary/30"
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pt-6 pb-10 flex-grow"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          renderItem={({ item }) => {
            const photos = [
              item.after_photo_url,
              item.before_photo_url,
              ...(Array.isArray(item.additional_photos) ? item.additional_photos : []),
            ].filter((u): u is string => typeof u === 'string' && u.length > 0);
            const coverUrl = photos[0];

            return (
              <View className="bg-surface rounded-2xl border border-border/50 mb-4 overflow-hidden shadow-sm">
                {coverUrl && (
                  <Image
                    source={{ uri: coverUrl }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                )}
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-base font-bold text-text flex-1 mr-2" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      className="p-2 -mr-2 -mt-2"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {item.description && (
                    <Text className="text-sm text-muted-text mb-3 leading-relaxed" numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}

                  {photos.length > 1 && (
                    <View className="flex-row gap-1 mb-3">
                      {photos.slice(1, 4).map((url: string, idx: number) => (
                        <Image
                          key={idx}
                          source={{ uri: url }}
                          className="w-14 h-14 rounded-lg"
                          resizeMode="cover"
                        />
                      ))}
                      {photos.length > 4 && (
                        <View className="w-14 h-14 rounded-lg bg-primary/10 items-center justify-center">
                          <Text className="text-primary font-bold text-xs">+{photos.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View className="flex-row flex-wrap gap-2">
                    {(item as any).categories?.name && (
                      <Badge label={(item as any).categories.name} variant="info" size="sm" />
                    )}
                    {item.client_location && (
                      <View className="flex-row items-center">
                        <MapPin size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text className="text-xs text-muted-text ml-1">{item.client_location}</Text>
                      </View>
                    )}
                    {item.completion_date && (
                      <View className="flex-row items-center">
                        <Calendar size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text className="text-xs text-muted-text ml-1">{item.completion_date}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<ImageIcon size={40} color="#6366F1" />}
              title="Sin trabajos publicados"
              description="Añade fotos de tus trabajos anteriores para ganar más presupuestos y destacar frente a otros profesionales."
              action={{ label: 'Añadir trabajo', onPress: () => router.push('/(professional)/portfolio/add') }}
            />
          }
        />
      )}
    </Screen>
  );
}
