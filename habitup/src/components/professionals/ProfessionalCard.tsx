import { View, Text, TouchableOpacity, Image } from 'react-native';
import { formatRating } from '@/utils/formatters';

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
  is_active: boolean;
  accepts_new_leads: boolean;
}

interface Props {
  professional: ProfessionalCardData;
  onPress: () => void;
}

export function ProfessionalCard({ professional, onPress }: Props) {
  const {
    full_name, avatar_url, company_name, description, avg_rating,
    total_reviews, location_city, location_region, categories, accepts_new_leads,
  } = professional;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row gap-3">
        {/* Avatar */}
        <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
          {avatar_url ? (
            <Image source={{ uri: avatar_url }} className="w-full h-full" />
          ) : (
            <Text className="text-2xl">{full_name.charAt(0).toUpperCase()}</Text>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {company_name ?? full_name}
            </Text>
            {!accepts_new_leads && (
              <Text className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">No disponible</Text>
            )}
          </View>

          {company_name && (
            <Text className="text-sm text-gray-500" numberOfLines={1}>{full_name}</Text>
          )}

          {/* Rating */}
          <View className="flex-row items-center gap-1 mt-1">
            <Text className="text-amber-400 text-sm">★</Text>
            <Text className="text-sm font-medium text-gray-800">{formatRating(avg_rating)}</Text>
            <Text className="text-sm text-gray-400">({total_reviews})</Text>
            {location_city && (
              <>
                <Text className="text-gray-300 mx-1">·</Text>
                <Text className="text-sm text-gray-500">{location_city}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Descripción */}
      {description && (
        <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>{description}</Text>
      )}

      {/* Categorías */}
      {categories && (
        <View className="flex-row flex-wrap gap-1 mt-2">
          {categories.split(', ').slice(0, 3).map((cat) => (
            <Text key={cat} className="text-xs bg-blue-50 text-brand px-2 py-0.5 rounded-full">
              {cat}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
