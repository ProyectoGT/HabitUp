import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ProfessionalCard } from '@/components/professionals';
import { professionalsService } from '@/services/professionals.service';
import type { Category } from '@/types/models';
import { Screen, Input, EmptyState, ErrorState } from '@/components/ui';
import { Search, MapPin } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getCategoryIcon, ICON_STROKE_WIDTH } from '@/utils/categoryIcons';
import { BLUEPRINT_TRACKING } from '@/utils/colors';

const MAX_PROMOTED = 3;
const PROMOTED_AFTER = 3;

/**
 * Ancho maximo del contenido.
 *
 * HabitUp es una app de movil. En Expo Web la ventana puede tener 1900px y
 * sin este tope la barra de busqueda mide un metro y las tarjetas se estiran
 * hasta perder toda proporcion. Centramos el contenido en una columna de
 * ancho de movil.
 */
const MAX_CONTENT_WIDTH = 520;

export default function SearchScreen() {
  const router = useRouter();
  const { results, isLoading, error, hasMore, search } = useProfessionals();
  const { colors } = useThemeColors();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const sideGutter = Math.max((width - contentWidth) / 2, 0);

  const [city, setCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    professionalsService.getCategories().then(setCategories);
    search({});
  }, [search]);

  const onSearch = useCallback(() => {
    search({
      city: city.trim() || undefined,
      category_slug: selectedCategory?.slug,
    });
  }, [city, selectedCategory, search]);

  const onLoadMore = () => {
    if (!isLoading && hasMore) {
      search(
        {
          city: city.trim() || undefined,
          category_slug: selectedCategory?.slug,
        },
        false,
      );
    }
  };

  const listData = useMemo(() => {
    const promoted = results.filter((p) => p.is_promoted).slice(0, MAX_PROMOTED);
    const organic = results.filter((p) => !p.is_promoted);
    if (promoted.length === 0) return organic;
    return [
      ...organic.slice(0, PROMOTED_AFTER),
      ...promoted,
      ...organic.slice(PROMOTED_AFTER),
    ];
  }, [results]);

  const sectionLabel = {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: BLUEPRINT_TRACKING,
    color: colors.mutedText,
    marginBottom: 8,
  };

  /**
   * La cabecera va DENTRO de la lista, no fija encima.
   * Al bajar se va con el contenido y deja toda la pantalla para resultados.
   */
  const Header = (
    <View style={{ paddingTop: 24, paddingBottom: 20 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
          marginBottom: 2,
        }}
      >
        Encuentra tu profesional
      </Text>
      <Text style={{ fontSize: 13, color: colors.mutedText, marginBottom: 16 }}>
        Reformas, urgencias y mantenimiento
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Ciudad o zona..."
            value={city}
            onChangeText={setCity}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            leftIcon={
              <MapPin size={18} color={colors.mutedText} strokeWidth={ICON_STROKE_WIDTH} />
            }
            className="mb-0"
            style={{ marginBottom: 0 }}
          />
        </View>
        <TouchableOpacity
          onPress={onSearch}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Buscar profesionales"
          style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={19} color={colors.onPrimary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <Text style={sectionLabel}>ESPECIALIDAD</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        <CategoryChip
          label="Todas"
          active={!selectedCategory}
          onPress={() => setSelectedCategory(null)}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.name}
            slug={cat.slug}
            active={selectedCategory?.id === cat.id}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          height: 1,
          backgroundColor: colors.border,
          marginTop: 20,
        }}
      />
    </View>
  );

  if (error) {
    return (
      <Screen safeArea={false} className="flex-1">
        <ErrorState message={error} onRetry={onSearch} />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false} className="flex-1">
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={{
          paddingHorizontal: 16 + sideGutter,
          paddingTop: 36,
          paddingBottom: 100,
        }}
        renderItem={({ item }) => (
          <ProfessionalCard
            professional={item}
            promoted={Boolean(item.is_promoted)}
            onPress={() => router.push(`/(client)/professional/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={
                <Search size={32} color={colors.mutedText} strokeWidth={ICON_STROKE_WIDTH} />
              }
              title="Aún no hay nada construido aquí"
              description="Prueba a ampliar la zona o quitar algún filtro."
            />
          )
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator
              style={{ marginVertical: 32 }}
              color={colors.primary}
              size="large"
            />
          ) : null
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
      />
    </Screen>
  );
}

function CategoryChip({
  label,
  slug,
  active,
  onPress,
}: {
  label: string;
  slug?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  const Icon = slug ? getCategoryIcon(slug) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: active ? colors.primary : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      {Icon && (
        <Icon
          size={15}
          color={active ? colors.onPrimary : colors.mutedText}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      )}
      <Text
        style={{ fontSize: 13, fontWeight: '600', color: active ? colors.onPrimary : colors.text }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
