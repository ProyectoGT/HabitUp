import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ProfessionalCard } from '@/components/professionals';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';

export default function SearchScreen() {
  const router = useRouter();
  const { results, isLoading, error, hasMore, search } = useProfessionals();

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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-900 mb-3">Buscar profesionales</Text>

        {/* Buscador por ciudad */}
        <View className="flex-row gap-2 mb-3">
          <TextInput
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-gray-900"
            placeholder="Ciudad o zona..."
            value={city}
            onChangeText={setCity}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={onSearch}
            className="bg-brand px-4 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-semibold">Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Filtro categorías */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <TouchableOpacity
            onPress={() => { setSelectedCategory(null); }}
            className={`px-3 py-1.5 rounded-full border mr-2 ${!selectedCategory ? 'bg-brand border-brand' : 'bg-white border-gray-300'}`}
          >
            <Text className={!selectedCategory ? 'text-white text-sm font-medium' : 'text-gray-600 text-sm'}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full border mr-2 ${selectedCategory?.id === cat.id ? 'bg-brand border-brand' : 'bg-white border-gray-300'}`}
            >
              <Text className={selectedCategory?.id === cat.id ? 'text-white text-sm font-medium' : 'text-gray-600 text-sm'}>
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
              className={`px-3 py-1.5 rounded-full border ${minRating === value ? 'bg-amber-400 border-amber-400' : 'bg-white border-gray-300'}`}
            >
              <Text className={`text-sm ${minRating === value ? 'text-white font-medium' : 'text-gray-600'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Resultados */}
      {error ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-500">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-10"
          renderItem={({ item }) => (
            <ProfessionalCard
              professional={item}
              onPress={() => router.push(`/(client)/professional/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="items-center mt-16">
                <Text className="text-gray-400 text-base">No se encontraron profesionales</Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoading ? <ActivityIndicator className="my-4" color="#2563eb" /> : null
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}
