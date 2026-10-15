import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { professionalsService } from '@/services/professionals.service';
import { formatCurrency } from '@/utils/formatters';
import { Avatar, Badge, LoadingState, EmptyState, ErrorState, Screen } from '@/components/ui';
import {
  Bell, DollarSign, Users, Briefcase,
  Calendar, Image as ImageIcon, Inbox,
} from 'lucide-react-native';
import type { Lead } from '@/types/models';

type DashboardStats = {
  monthlyIncome: number;
  activeProjects: number;
  availableLeads: number;
  recentLeads: Lead[];
  upcoming: { id: string; title: string; start_date: string; status: string }[];
};

export default function ProfessionalHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const professionalProfile = useAuthStore((s) => s.professionalProfile);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const firstName = user?.full_name?.split(' ')[0] || 'Profesional';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!professionalProfile) return;
    try {
      const data = await professionalsService.getDashboardStats(professionalProfile.id);
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [professionalProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statItems = stats
    ? [
        { label: 'Ingresos (mes)', value: formatCurrency(stats.monthlyIncome), change: '', Icon: DollarSign },
        { label: 'Leads disponibles', value: String(stats.availableLeads), change: '', Icon: Users },
        { label: 'Proyectos activos', value: String(stats.activeProjects), change: '', Icon: Briefcase },
      ]
    : [];

  if (isLoading) {
    return (
      <Screen safeArea={false} className="flex-1">
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen safeArea={false} className="flex-1">
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" colors={['#6366F1']} />}
      >
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
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bell size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#EF4444',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {statItems.map((stat) => (
              <View
                key={stat.label}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <stat.Icon size={22} color="#fff" strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{stat.label}</Text>
                  <View className="flex-row items-baseline gap-2">
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{stat.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View
          style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        >
          {/* ── Nuevos leads ── */}
          <View className="bg-surface rounded-2xl border border-border mb-5 overflow-hidden">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <View>
                <Text className="text-base font-bold text-text">Nuevos leads</Text>
                <Text className="text-muted-text text-xs mt-0.5">
                  {stats?.recentLeads?.length ?? 0} solicitudes activas
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(professional)/leads/available')}>
                <Text className="text-sm text-primary font-semibold">Ver todos</Text>
              </TouchableOpacity>
            </View>

            {stats?.recentLeads && stats.recentLeads.length > 0 ? (
              stats.recentLeads.slice(0, 3).map((lead, idx) => {
                const clientName = (lead as any).users?.full_name ?? 'Cliente';
                return (
                  <TouchableOpacity
                    key={lead.id}
                    onPress={() => router.push(`/(professional)/leads/${lead.id}`)}
                    activeOpacity={0.7}
                    className={`flex-row items-center gap-3 px-5 py-4 ${idx < 2 ? 'border-b border-border' : ''}`}
                  >
                    <Avatar fallback={clientName} size="sm" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-semibold text-text text-sm" numberOfLines={1}>{clientName}</Text>
                        {lead.urgency === 'alta' && (
                          <Badge label="Urgente" variant="error" size="sm" />
                        )}
                      </View>
                      <Text className="text-muted-text text-xs mt-0.5" numberOfLines={1}>{lead.title}</Text>
                    </View>
                    <View className="items-end" style={{ gap: 2 }}>
                      <Text className="text-primary font-semibold text-sm">
                        {lead.budget_max ? `Hasta ${formatCurrency(lead.budget_max)}` : 'Sin presupuesto'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <EmptyState
                icon={<Inbox size={40} color="#6366F1" />}
                title="Sin actividad reciente"
                description="No hay leads o proyectos disponibles en este momento."
              />
            )}
          </View>

          {/* ── Próximos proyectos ── */}
          <View className="bg-surface rounded-2xl border border-border mb-5 overflow-hidden">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <Text className="text-base font-bold text-text">Próximos proyectos</Text>
              <Calendar size={20} color="#6366F1" />
            </View>

            {stats?.upcoming && stats.upcoming.length > 0 ? (
              stats.upcoming.map((meet, idx) => (
                <TouchableOpacity
                  key={meet.id}
                  onPress={() => router.push(`/(professional)/projects/${meet.id}`)}
                  activeOpacity={0.7}
                  className={`flex-row items-center gap-3 px-5 py-4 ${idx < stats.upcoming.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <Avatar fallback={meet.title} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="font-semibold text-text text-sm" numberOfLines={1}>{meet.title}</Text>
                    <Text className="text-muted-text text-xs mt-0.5">Proyecto programado</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Calendar size={13} color="#6366F1" />
                    <Text className="text-primary font-semibold text-xs">{meet.start_date}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState
                icon={<Inbox size={40} color="#6366F1" />}
                title="Sin actividad reciente"
                description="No hay leads o proyectos disponibles en este momento."
              />
            )}
          </View>

          {/* ── Quick actions grid ── */}
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => router.push('/(professional)/projects')}
              activeOpacity={0.8}
              className="flex-1 bg-surface rounded-2xl border border-border p-5 items-center"
            >
              <View className="w-12 h-12 bg-primary/10 rounded-2xl items-center justify-center mb-3">
                <Briefcase size={24} color="#6366F1" />
              </View>
              <Text className="text-text font-bold text-sm">Proyectos</Text>
              <Text className="text-muted-text text-xs mt-0.5">Gestionar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(professional)/portfolio')}
              activeOpacity={0.8}
              className="flex-1 bg-surface rounded-2xl border border-border p-5 items-center"
            >
              <View className="w-12 h-12 bg-success/10 rounded-2xl items-center justify-center mb-3">
                <ImageIcon size={24} color="#10B981" />
              </View>
              <Text className="text-text font-bold text-sm">Portfolio</Text>
              <Text className="text-muted-text text-xs mt-0.5">Mis fotos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
