import React from 'react';
import { View, Text } from 'react-native';
import { formatRating } from '@/utils/formatters';
import { Card, Avatar, Badge } from '@/components/ui';
import { Star, MapPin } from 'lucide-react-native';

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
    total_reviews, location_city, categories, accepts_new_leads,
  } = professional;

  return (
    <Card onPress={onPress} className="mb-4">
      <View className="flex-row gap-4 mb-3">
        <Avatar 
          url={avatar_url} 
          fallback={full_name} 
          size="lg" 
        />

        <View className="flex-1 justify-center">
          <View className="flex-row items-start justify-between">
            <Text className="text-lg font-bold text-text mb-0.5" numberOfLines={1}>
              {company_name ?? full_name}
            </Text>
            {!accepts_new_leads && (
              <Badge label="No disponible" variant="error" size="sm" />
            )}
          </View>

          {company_name && (
            <Text className="text-sm font-medium text-muted-text mb-1" numberOfLines={1}>
              {full_name}
            </Text>
          )}

          <View className="flex-row items-center gap-2 mt-1">
            <View className="flex-row items-center">
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-sm font-bold text-text ml-1">{formatRating(avg_rating)}</Text>
              <Text className="text-sm text-muted-text ml-1">({total_reviews})</Text>
            </View>
            
            {location_city && (
              <View className="flex-row items-center">
                <Text className="text-border mx-1">•</Text>
                <MapPin size={12} color="#94A3B8" />
                <Text className="text-xs text-muted-text ml-1">{location_city}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {description && (
        <Text className="text-sm text-text leading-relaxed mt-1" numberOfLines={2}>
          {description}
        </Text>
      )}

      {categories && (
        <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
          {categories.split(', ').slice(0, 3).map((cat) => (
            <Badge key={cat} label={cat} variant="info" size="sm" />
          ))}
        </View>
      )}
    </Card>
  );
}
