import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatRating } from '@/utils/formatters';
import { Avatar, Badge, ApprovalSeal, type SealLevel } from '@/components/ui';
import { Star, MapPin } from 'lucide-react-native';
import { getCategoryIcon, ICON_STROKE_WIDTH } from '@/utils/categoryIcons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BLUEPRINT_TRACKING } from '@/utils/colors';

export interface ProfessionalCardData {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  company_name: string | null;
  description: string | null;
  avg_rating: number;
  total_reviews: number;
  total_projects_completed: number;
  location_city: string | null;
  location_region: string | null;
  categories: string | null;
  category_slugs?: string | null;
  is_active: boolean;
  accepts_new_leads: boolean;
  nif_cif_verified?: boolean;
  documents_verified?: boolean;
  /**
   * Nivel de sello calculado en BD por percentil dentro de categoría + zona.
   * Si viene undefined, la tarjeta cae al distintivo de verificación básica.
   */
  seal_level?: SealLevel | null;
  /** Distancia al usuario, en km. Solo en búsquedas con geolocalización. */
  distance_km?: number | null;
  /** Slot promocionado por suscripción. Nunca altera el orden por mérito. */
  is_promoted?: boolean;
}

interface Props {
  professional: ProfessionalCardData;
  onPress: () => void;
  /** Marca la tarjeta como slot promocionado. Debe verse distinto y honesto. */
  promoted?: boolean;
}

export function ProfessionalCard({
  professional,
  onPress,
  promoted = false,
}: Props) {
  const { colors } = useThemeColors();
  const {
    full_name, avatar_url, company_name, description, avg_rating,
    total_reviews, location_city, categories, category_slugs,
    accepts_new_leads, nif_cif_verified, documents_verified,
    seal_level, distance_km,
  } = professional;

  const isFullyVerified =
    nif_cif_verified && documents_verified && (total_reviews ?? 0) > 0;

  // El sello de mérito manda; la verificación es el escalón de entrada.
  const seal: SealLevel | null =
    seal_level ?? (isFullyVerified ? 'verified' : null);

  const isNew = (total_reviews ?? 0) === 0;

  const categoryList = categories?.split(', ').filter(Boolean) ?? [];
  const slugList = category_slugs?.split(',').filter(Boolean) ?? [];
  const PrimaryIcon = getCategoryIcon(slugList[0]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${company_name ?? full_name}, ${
        isNew
          ? 'nuevo en HabitUp'
          : `${formatRating(avg_rating)} de 5 con ${total_reviews} reseñas`
      }`}
      className="mb-3"
      style={{
        borderRadius: 6,
        borderWidth: 1,
        borderColor: promoted ? colors.promotedBorder : colors.border,
        backgroundColor: promoted ? colors.promotedBg : colors.surface,
        padding: 16,
      }}
    >
      {promoted && (
        <Text
          style={{
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: BLUEPRINT_TRACKING,
            color: colors.mutedText,
            marginBottom: 8,
          }}
        >
          PROMOCIONADO
        </Text>
      )}

      <View className="flex-row gap-4">
        <Avatar url={avatar_url} fallback={full_name} size="lg" />

        <View className="flex-1 justify-center">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-text flex-1" numberOfLines={1}>
              {company_name ?? full_name}
            </Text>
            {seal && <ApprovalSeal level={seal} variant="compact" />}
          </View>

          {company_name && (
            <Text className="text-xs text-muted-text mt-0.5" numberOfLines={1}>
              {full_name}
            </Text>
          )}

          <View className="flex-row items-center gap-3 mt-2">
            {isNew ? (
              <View
                style={{
                  paddingVertical: 2,
                  paddingHorizontal: 6,
                  borderRadius: 4,
                  backgroundColor: colors.blueprintSoft,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: BLUEPRINT_TRACKING,
                    color: colors.blueprint,
                  }}
                >
                  NUEVO EN HABITUP
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Star size={13} color={colors.sealGold} fill={colors.sealGold} />
                <Text
                  className="text-sm font-bold text-text ml-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatRating(avg_rating)}
                </Text>
                <Text className="text-xs text-muted-text ml-1">({total_reviews})</Text>
              </View>
            )}

            {location_city && (
              <View className="flex-row items-center">
                <MapPin size={12} color={colors.mutedText} strokeWidth={ICON_STROKE_WIDTH} />
                <Text className="text-xs text-muted-text ml-1" numberOfLines={1}>
                  {location_city}
                  {typeof distance_km === 'number' && ` · ${distance_km.toFixed(0)} km`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {description && (
        <Text className="text-sm text-text leading-relaxed mt-3" numberOfLines={2}>
          {description}
        </Text>
      )}

      {categoryList.length > 0 && (
        <View
          className="flex-row flex-wrap items-center gap-2 mt-3 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <PrimaryIcon size={14} color={colors.blueprint} strokeWidth={ICON_STROKE_WIDTH} />
          {categoryList.slice(0, 3).map((cat) => (
            <Badge key={cat} label={cat} variant="info" size="sm" />
          ))}
          {categoryList.length > 3 && (
            <Text className="text-xs text-muted-text">+{categoryList.length - 3}</Text>
          )}
        </View>
      )}

      {!accepts_new_leads && (
        <View className="mt-3">
          <Badge label="No acepta encargos ahora" variant="default" size="sm" />
        </View>
      )}
    </TouchableOpacity>
  );
}
