import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { professionalsService } from '@/services/professionals.service';
import { formatRating } from '@/utils/formatters';
import type { ProfessionalProfile, Category } from '@/types/models';

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  }
  if (!profile) {
    return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Profesional no encontrado</Text></View>;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="pb-32">
        {/* Header */}
        <View className="bg-white px-5 pt-14 pb-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-brand text-base">← Volver</Text>
          </TouchableOpacity>

          <View className="flex-row gap-4 items-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center overflow-hidden">
              <Text className="text-3xl">
                {profile.company_name?.charAt(0) ?? '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {profile.company_name ?? 'Profesional'}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-amber-400">★</Text>
                <Text className="font-medium text-gray-800">{formatRating(profile.avg_rating)}</Text>
                <Text className="text-gray-400">({profile.total_reviews} reseñas)</Text>
              </View>
              {profile.location_city && (
                <Text className="text-gray-500 text-sm mt-0.5">
                  📍 {profile.location_city}, {profile.location_region}
                </Text>
              )}
            </View>
          </View>

          {/* Badges */}
          <View className="flex-row gap-2 mt-4">
            <Badge text={`${profile.experience_years ?? 0} años exp.`} />
            <Badge text={`Radio ${profile.service_radius_km} km`} />
            {profile.nif_cif_verified && <Badge text="✓ Verificado" color="green" />}
            {!profile.accepts_new_leads && <Badge text="Sin disponibilidad" color="gray" />}
          </View>
        </View>

        {/* Descripción */}
        {profile.description && (
          <Section title="Sobre el profesional">
            <Text className="text-gray-700 leading-6">{profile.description}</Text>
          </Section>
        )}

        {/* Especialidades */}
        {categories.length > 0 && (
          <Section title="Especialidades">
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => (
                <Text key={cat.id} className="px-3 py-1.5 bg-blue-50 text-brand text-sm rounded-full">
                  {cat.name}
                </Text>
              ))}
            </View>
          </Section>
        )}

        {/* Stats */}
        <Section title="Trayectoria">
          <View className="flex-row gap-4">
            <Stat label="Proyectos" value={String(profile.total_projects_completed)} />
            <Stat label="Reseñas" value={String(profile.total_reviews)} />
            <Stat label="Valoración" value={formatRating(profile.avg_rating)} suffix="/ 5" />
          </View>
        </Section>
      </ScrollView>

      {/* CTA fijo */}
      {profile.accepts_new_leads && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={() => router.push(`/(client)/leads/create?professionalId=${id}`)}
            className="bg-brand py-4 rounded-xl items-center"
          >
            <Text className="text-white font-semibold text-base">Pedir presupuesto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white mx-4 mt-3 rounded-2xl p-5 shadow-sm">
      <Text className="text-base font-semibold text-gray-900 mb-3">{title}</Text>
      {children}
    </View>
  );
}

function Badge({ text, color = 'blue' }: { text: string; color?: 'blue' | 'green' | 'gray' }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 text-brand',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <Text className={`text-xs px-3 py-1 rounded-full ${styles[color]}`}>{text}</Text>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View className="flex-1 items-center bg-gray-50 rounded-xl p-3">
      <Text className="text-2xl font-bold text-brand">
        {value}<Text className="text-sm font-normal text-gray-500">{suffix}</Text>
      </Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
}
