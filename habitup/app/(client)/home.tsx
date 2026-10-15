import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Screen, Card, Button, Badge, Avatar, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import {
  Bell, TrendingUp, Clock, CheckCircle2,
  ArrowRight, Sparkles, Plus, Inbox, Users,
} from 'lucide-react-native';

const STATS = [
  { label: 'Proyectos\nactivos', value: '3', Icon: TrendingUp },
  { label: 'Pendientes', value: '2', Icon: Clock },
  { label: 'Completados', value: '12', Icon: CheckCircle2 },
];

const RECENT_ACTIVITY = [
  { id: '1', professional: 'María García', service: 'Diseño Web', status: 'in_progress', date: 'Hace 2h' },
  { id: '2', professional: 'Carlos Rodríguez', service: 'Marketing Digital', status: 'completed', date: 'Ayer' },
  { id: '3', professional: 'Ana Martínez', service: 'Fotografía', status: 'pending', date: 'Hace 3 días' },
];

const SUGGESTED = [
  { id: '1', name: 'Laura Sánchez', specialty: 'Desarrollo Mobile', rating: '4.9', price: '50€/hr' },
  { id: '2', name: 'Diego Torres', specialty: 'Consultoría SEO', rating: '4.8', price: '40€/hr' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  completed:   { label: 'Completado', variant: 'success' },
  in_progress: { label: 'En progreso', variant: 'info' },
  pending:     { label: 'Pendiente',   variant: 'warning' },
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const firstName = user?.full_name?.split(' ')[0] || 'Usuario';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats] = useState(STATS);
  const [recentActivity] = useState(RECENT_ACTIVITY);
  const [suggested] = useState(SUGGESTED);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <Screen safeArea={false}>
        <LoadingState message="Cargando tu panel..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen safeArea={false}>
        <ErrorState message={error} onRetry={handleRetry} />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 2 }}>
              Bienvenido de nuevo
            </Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
              {firstName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{
              width: 40, height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Bell size={20} color="#fff" />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#EF4444',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3">
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <stat.Icon size={18} color="#fff" strokeWidth={2} />
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8 }}>
                {stat.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Actividad reciente ── */}
        <Card variant="outlined" className="mb-5 p-0 overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <Text className="text-base font-bold text-text">Actividad reciente</Text>
            <TouchableOpacity onPress={() => router.push('/(client)/leads')}>
              <Text className="text-sm text-primary font-semibold">Ver todo</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length > 0 ? (
            recentActivity.map((item, idx) => {
              const cfg = STATUS_CONFIG[item.status] || { label: item.status, variant: 'default' as const };
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push('/(client)/leads')}
                  activeOpacity={0.7}
                  className={`flex-row items-center gap-3 px-5 py-4 ${idx < recentActivity.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <Avatar fallback={item.professional} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="font-semibold text-text text-sm" numberOfLines={1}>
                      {item.professional}
                    </Text>
                    <Text className="text-muted-text text-xs mt-0.5" numberOfLines={1}>
                      {item.service}
                    </Text>
                  </View>
                  <View className="items-end" style={{ gap: 4 }}>
                    <Badge label={cfg.label} variant={cfg.variant} size="sm" />
                    <Text className="text-muted-text text-xs">{item.date}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <EmptyState
              icon={<Inbox size={32} color="#6366F1" />}
              title="Sin actividad reciente"
              description="No tienes solicitudes o proyectos aún."
              action={{ label: 'Crear solicitud', onPress: () => router.push('/(client)/leads/create') }}
            />
          )}
        </Card>

        {/* ── Recomendados para ti ── */}
        <Card variant="outlined" className="mb-5 p-0 overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <View>
              <Text className="text-base font-bold text-text">Recomendados para ti</Text>
              <Text className="text-muted-text text-xs mt-0.5">Profesionales que podrían interesarte</Text>
            </View>
            <Sparkles size={20} color="#F59E0B" />
          </View>

          {suggested.length > 0 ? (
            suggested.map((prof, idx) => (
              <TouchableOpacity
                key={prof.id}
                onPress={() => router.push(`/(client)/professional/${prof.id}`)}
                activeOpacity={0.7}
                className={`flex-row items-center gap-3 px-5 py-4 ${idx < suggested.length - 1 ? 'border-b border-border' : ''}`}
              >
                <Avatar fallback={prof.name} size="md" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="font-semibold text-text" numberOfLines={1}>{prof.name}</Text>
                  <Text className="text-muted-text text-sm mt-0.5" numberOfLines={1}>{prof.specialty}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-warning text-xs font-semibold">★ {prof.rating}</Text>
                    <Text className="text-muted-text text-xs">{prof.price}</Text>
                  </View>
                </View>
                <ArrowRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon={<Users size={32} color="#6366F1" />}
              title="No hay recomendaciones"
              description="Por ahora no tenemos profesionales sugeridos para ti."
            />
          )}
        </Card>

        {/* ── CTA ── */}
        <Button
          label="Explorar más profesionales"
          onPress={() => router.push('/(client)/search')}
          size="lg"
          className="w-full shadow-lg"
          style={{
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
          }}
        />

        {/* ── Nueva solicitud shortcut ── */}
        <Button
          label="Nueva solicitud"
          onPress={() => router.push('/(client)/leads/create')}
          variant="outline"
          leftIcon={<Plus size={18} color="#6366F1" />}
          className="w-full mt-3"
        />
      </ScrollView>
    </Screen>
  );
}
