import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePublicProfile, getTrustLevel } from '@/hooks/usePublicProfile';
import { formatRating } from '@/utils/formatters';
import { Screen, Button, Avatar, Badge, Card, VerifiedBadge } from '@/components/ui';
import { ArrowLeft, Star, MapPin, ShieldCheck, Clock, Briefcase, CheckCircle2, Award } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { profile, trustSummary, categories, isLoading, error } = usePublicProfile(id);

  if (isLoading) {
    return (
      <Screen safeArea className="items-center justify-center">
        <ActivityIndicator color="#6366F1" size="large" />
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen safeArea className="items-center justify-center p-6">
        <Text className="text-muted-text text-lg text-center">Profesional no encontrado</Text>
        <Button label="Volver" variant="outline" onPress={() => router.back()} className="mt-4" />
      </Screen>
    );
  }

  const trustLevel = getTrustLevel(trustSummary);
  const summary = trustSummary;

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
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-2xl font-extrabold text-text leading-tight flex-1">
                  {profile.company_name ?? 'Profesional'}
                </Text>
              </View>

              <VerifiedBadge level={trustLevel} size="sm" />

              <View className="flex-row items-center mt-2">
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

          {/* Trust & Info Badges */}
          <View className="flex-row flex-wrap gap-2">
            <Badge
              label={`${profile.experience_years ?? 0} años exp.`}
              variant="info"
            />
            <Badge
              label={`Radio ${profile.service_radius_km} km`}
              variant="default"
            />
            {summary?.total_projects_completed != null && summary.total_projects_completed > 0 && (
              <Badge
                label={`${summary.total_projects_completed} proyectos`}
                variant="success"
              />
            )}
            {summary?.response_time_hours != null && (
              <Badge
                label={`Respuesta ~${summary.response_time_hours}h`}
                variant="info"
              />
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

          {/* Estado de verificación detallado */}
          {summary && (
            <Card variant="flat" className="border border-border/50">
              <Text className="text-lg font-bold text-text mb-4">Verificación</Text>
              <View className="gap-3">
                <VerificationRow
                  icon={ShieldCheck}
                  label="NIF/CIF"
                  verified={summary.nif_cif_verified}
                />
                <VerificationRow
                  icon={ShieldCheck}
                  label="Documentos"
                  verified={summary.documents_verified}
                />
                <VerificationRow
                  icon={CheckCircle2}
                  label="Compra verificada"
                  verified={(summary?.total_reviews ?? 0) > 0}
                  detail={summary ? `${summary.approved_documents} docs. aprobados` : undefined}
                />
              </View>
              {trustLevel === 'verified' && (
                <View className="mt-4 bg-success/10 p-3 rounded-xl border border-success/20 flex-row items-center gap-2">
                  <ShieldCheck size={18} color="#10B981" />
                  <Text className="text-success text-sm font-semibold flex-1">
                    Profesional verificado — cumple con todos los requisitos de confianza
                  </Text>
                </View>
              )}
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

          {/* Stats de trayectoria */}
          <Card variant="flat" className="border border-border/50">
            <Text className="text-lg font-bold text-text mb-4">Trayectoria</Text>
            <View className="flex-row justify-between gap-3">
              <Stat
                label="Proyectos"
                value={String(summary?.total_projects_completed ?? profile.total_projects_completed)}
              />
              <Stat label="Reseñas" value={String(summary?.total_reviews ?? profile.total_reviews)} />
              <Stat label="Valoración" value={formatRating(profile.avg_rating)} suffix="/5" />
            </View>
            {summary?.response_time_hours != null && (
              <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-border/50 gap-2">
                <Clock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text className="text-sm text-muted-text font-medium">
                  Tiempo de respuesta medio: ~{summary.response_time_hours}h
                </Text>
              </View>
            )}
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

function VerificationRow({
  icon: Icon,
  label,
  verified,
  detail,
}: {
  icon: any;
  label: string;
  verified: boolean;
  detail?: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className={`w-8 h-8 rounded-full items-center justify-center ${verified ? 'bg-success/20' : 'bg-muted-text/10'}`}>
        <Icon size={16} color={verified ? '#10B981' : '#94A3B8'} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">{label}</Text>
        {detail && <Text className="text-xs text-muted-text">{detail}</Text>}
      </View>
      <Text className={`text-xs font-bold ${verified ? 'text-success' : 'text-muted-text'}`}>
        {verified ? 'Verificado' : 'Pendiente'}
      </Text>
    </View>
  );
}
