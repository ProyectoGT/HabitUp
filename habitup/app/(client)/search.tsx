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
import { Screen, Input, EmptyState, ErrorState } from '@/components/ui';
import { Search, MapPin } from 'lucide-react-native';
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
  }, [search]);

  const onSearch = useCallback(() => {
    search({
      city: city.trim() || undefined,
      category_slug: selectedCategory?.slug,
      min_rating: minRating,
    });
  }, [city, selectedCategory, minRating, search]);

  const onLoadMore = () => {
    if (!isLoading && hasMore) {
      search({ city: city.trim() || undefined, category_slug: selectedCategory?.slug, min_rating: minRating }, false);
    }
  };

  const RATINGS = [
    { label: 'Todos',  value: undefined },
    { label: '4★+',    value: 4 },
    { label: '4.5★+',  value: 4.5 },
  ];

  const surfaceBg  = isDark ? '#1A1D29' : '#FFFFFF';
  const borderCol  = isDark ? '#2D3548' : '#E2E8F0';
  const chipBg     = isDark ? '#1E2433' : '#F1F5F9';
  const chipText   = isDark ? '#94A3B8' : '#64748B';

  return (
    <Screen safeArea={false} className="flex-1">
      {/* ── Sticky header ── */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 12,
          paddingHorizontal: 24,
          backgroundColor: surfaceBg,
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className="text-2xl font-extrabold text-text mb-4">Explorar</Text>

        {/* Search bar */}
        <View className="flex-row items-center gap-3 mb-4">
          <View style={{ flex: 1 }}>
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
          <TouchableOpacity
            onPress={onSearch}
            activeOpacity={0.85}
            style={{
              width: 50, height: 50,
              borderRadius: 14,
              backgroundColor: '#6366F1',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#6366F1',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Search size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -24 }}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          className="mb-3"
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.8}
            style={{
              paddingVertical: 7, paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: !selectedCategory ? '#6366F1' : chipBg,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: !selectedCategory ? '#fff' : chipText }}>
              Todos
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 7, paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selectedCategory?.id === cat.id ? '#6366F1' : chipBg,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: selectedCategory?.id === cat.id ? '#fff' : chipText }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Rating chips */}
        <View className="flex-row gap-2">
          {RATINGS.map(({ label, value }) => (
            <TouchableOpacity
              key={label}
              onPress={() => setMinRating(value)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 6, paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: minRating === value ? 'rgba(245,158,11,0.15)' : chipBg,
                borderWidth: 1.5,
                borderColor: minRating === value ? '#F59E0B' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '600',
                color: minRating === value ? '#F59E0B' : chipText,
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Results ── */}
      {error ? (
        <ErrorState message={error} onRetry={onSearch} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <ProfessionalCard
              professional={item}
              onPress={() => router.push(`/(client)/professional/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyState
                icon={<Search size={32} color="#94A3B8" />}
                title="Sin resultados"
                description="No encontramos profesionales con estos filtros."
              />
            )
          }
          ListFooterComponent={
            isLoading ? <ActivityIndicator style={{ marginVertical: 32 }} color="#6366F1" size="large" /> : null
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </Screen>
  );
}
