import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { professionalsService } from '@/services/professionals.service';
import { formatRating } from '@/utils/formatters';
import type { ProfessionalProfile, Category } from '@/types/models';
import { Screen, Button, Avatar, Badge, Card } from '@/components/ui';
import { ArrowLeft, Star, MapPin, CheckCircle2, ShieldCheck, Map } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      professionalsService.getProfileById(id),
      professionalsService.getMyCategories(id),
    ]).then(([p, cats]) => {
      setProfile(p);
      setCategories(cats);
    }).finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <Screen safeArea className="items-center justify-center">
        <ActivityIndicator color="#6366F1" size="large" />
      </Screen>
    );
  }
  if (!profile) {
    return (
      <Screen safeArea className="items-center justify-center p-6">
        <Text className="text-muted-text text-lg text-center">Profesional no encontrado</Text>
        <Button label="Volver" variant="outline" onPress={() => router.back()} className="mt-4" />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false} className="flex-1 relative">
      <ScrollView contentContainerClassName="pb-32" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="bg-surface px-6 pt-16 pb-8 rounded-b-3xl shadow-sm shadow-primary/10 border-b border-border/50">
          <TouchableOpacity onPress={() => router.back()} className="mb-6 flex-row items-center">
            <ArrowLeft size={20} color="#6366F1" />
            <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-6">
            <Avatar 
              url={profile.users?.avatar_url ?? null}
              fallback={profile.company_name ?? profile.users?.full_name ?? 'P'}
              size="xl" 
            />
            <View className="flex-1 ml-4">
              <Text className="text-2xl font-extrabold text-text mb-1 leading-tight">
                {profile.company_name ?? 'Profesional'}
              </Text>
              
              <View className="flex-row items-center mt-1">
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text className="font-bold text-text ml-1 text-base">{formatRating(profile.avg_rating)}</Text>
                <Text className="text-muted-text ml-1">({profile.total_reviews} reseñas)</Text>
              </View>
              
              {profile.location_city && (
                <View className="flex-row items-center mt-2">
                  <MapPin size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text className="text-muted-text text-sm ml-1 font-medium">
                    {profile.location_city}, {profile.location_region}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status Badges */}
          <View className="flex-row flex-wrap gap-2">
            <Badge 
              label={`${profile.experience_years ?? 0} años exp.`} 
              variant="info" 
            />
            <Badge 
              label={`Radio ${profile.service_radius_km} km`} 
              variant="default" 
            />
            {profile.nif_cif_verified && (
              <View className="flex-row items-center bg-success/10 px-2 py-0.5 rounded-md">
                <ShieldCheck size={12} color="#10B981" />
                <Text className="text-success text-xs font-medium ml-1">Verificado</Text>
              </View>
            )}
            {!profile.accepts_new_leads && (
              <Badge label="Sin disponibilidad" variant="error" />
            )}
          </View>
        </View>

        {/* Content Section */}
        <View className="px-6 mt-6 gap-4">
          {/* Descripción */}
          {profile.description && (
            <Card variant="flat" className="border border-border/50">
              <Text className="text-lg font-bold text-text mb-2">Sobre el profesional</Text>
              <Text className="text-text leading-relaxed">{profile.description}</Text>
            </Card>
          )}

          {/* Especialidades */}
          {categories.length > 0 && (
            <Card variant="flat" className="border border-border/50">
              <Text className="text-lg font-bold text-text mb-3">Especialidades</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge key={cat.id} label={cat.name} variant="info" size="md" />
                ))}
              </View>
            </Card>
          )}

          {/* Stats */}
          <Card variant="flat" className="border border-border/50">
            <Text className="text-lg font-bold text-text mb-4">Trayectoria</Text>
            <View className="flex-row justify-between gap-3">
              <Stat label="Proyectos" value={String(profile.total_projects_completed)} />
              <Stat label="Reseñas" value={String(profile.total_reviews)} />
              <Stat label="Valoración" value={formatRating(profile.avg_rating)} suffix="/5" />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* CTA Bottom Bar */}
      {profile.accepts_new_leads && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface px-6 pt-4 pb-8 border-t border-border/50 shadow-lg">
          <Button
            label="Pedir presupuesto"
            onPress={() => router.push(`/(client)/leads/create?professionalId=${id}`)}
            size="lg"
            className="w-full shadow-sm shadow-primary/30"
          />
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View className="flex-1 items-center bg-background rounded-2xl p-4 border border-border/30">
      <View className="flex-row items-end mb-1">
        <Text className="text-2xl font-extrabold text-primary">
          {value}
        </Text>
        {suffix && (
          <Text className="text-sm font-semibold text-muted-text mb-1 ml-0.5">{suffix}</Text>
        )}
      </View>
      <Text className="text-xs font-medium text-muted-text">{label}</Text>
    </View>
  );
}
