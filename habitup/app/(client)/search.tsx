import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ProfessionalCard } from '@/components/professionals';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';
import { Screen, Input, Button } from '@/components/ui';
import { Search, MapPin, Star } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function SearchScreen() {
  const router = useRouter();
  const { results, isLoading, error, hasMore, search } = useProfessionals();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [city, setCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    professionalsService.getCategories().then(setCategories);
    search({});
  }, []);

  const onSearch = useCallback(() => {
    search({
      city: city.trim() || undefined,
      category_slug: selectedCategory?.slug,
      min_rating: minRating,
    });
  }, [city, selectedCategory, minRating, search]);

  const onLoadMore = () => {
    if (!isLoading && hasMore) {
      search({
        city: city.trim() || undefined,
        category_slug: selectedCategory?.slug,
        min_rating: minRating,
      }, false);
    }
  };

  const RATINGS = [
    { label: 'Todos', value: undefined },
    { label: '4★+', value: 4 },
    { label: '4.5★+', value: 4.5 },
  ];

  return (
    <Screen safeArea={false} className="flex-1">
      {/* Header */}
      <View className="bg-surface px-6 pt-16 pb-4 rounded-b-3xl shadow-sm shadow-primary/10 z-10 border-b border-border/50">
        <Text className="text-2xl font-extrabold text-text mb-4">Explorar</Text>

        {/* Buscador por ciudad */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1">
            <Input
              placeholder="Ciudad o zona..."
              value={city}
              onChangeText={setCity}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              leftIcon={<MapPin size={20} color={isDark ? '#94A3B8' : '#64748B'} />}
              className="mb-0 border-border/80"
              style={{ marginBottom: 0 }}
            />
          </View>
          <Button
            label=""
            onPress={onSearch}
            leftIcon={<Search size={20} color="#FFF" />}
            size="sm"
            className="w-12 h-[50px] mt-[-16px] rounded-2xl shadow-sm shadow-primary/30"
          />
        </View>

        {/* Filtro categorías */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <TouchableOpacity
            onPress={() => { setSelectedCategory(null); }}
            className={`px-4 py-2 rounded-full mr-2 border-2 ${
              !selectedCategory ? 'bg-primary border-primary' : 'bg-surface border-border'
            }`}
          >
            <Text className={`text-sm font-semibold ${!selectedCategory ? 'text-white' : 'text-muted-text'}`}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full mr-2 border-2 ${
                selectedCategory?.id === cat.id ? 'bg-primary border-primary' : 'bg-surface border-border'
              }`}
            >
              <Text className={`text-sm font-semibold ${selectedCategory?.id === cat.id ? 'text-white' : 'text-muted-text'}`}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtro rating */}
        <View className="flex-row gap-2">
          {RATINGS.map(({ label, value }) => (
            <TouchableOpacity
              key={label}
              onPress={() => setMinRating(value)}
              className={`px-4 py-1.5 rounded-full flex-row items-center border-2 ${
                minRating === value ? 'bg-warning/20 border-warning' : 'bg-surface border-border'
              }`}
            >
              {value !== undefined && <Star size={12} color={minRating === value ? '#F59E0B' : (isDark ? '#94A3B8' : '#64748B')} className="mr-1" />}
              <Text className={`text-sm font-medium ${minRating === value ? 'text-warning' : 'text-muted-text'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Resultados */}
      {error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-error text-center bg-error/10 p-4 rounded-xl">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pt-6 pb-24"
          renderItem={({ item }) => (
            <ProfessionalCard
              professional={item}
              onPress={() => router.push(`/(client)/professional/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="items-center justify-center mt-20">
                <View className="w-16 h-16 bg-border/50 rounded-full items-center justify-center mb-4">
                  <Search size={32} color={isDark ? '#94A3B8' : '#64748B'} />
                </View>
                <Text className="text-text font-bold text-lg mb-1">Sin resultados</Text>
                <Text className="text-muted-text text-center">No encontramos profesionales con estos filtros.</Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoading ? <ActivityIndicator className="my-8" color="#6366F1" size="large" /> : null
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </Screen>
  );
}
