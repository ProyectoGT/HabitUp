import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar, Badge } from '@/components/ui';
import {
  Bell, DollarSign, Users, Briefcase,
  ArrowUpRight, Calendar, Image as ImageIcon,
} from 'lucide-react-native';

const STATS = [
  { label: 'Ingresos (mes)', value: '4.250€', change: '+12%', Icon: DollarSign },
  { label: 'Nuevos leads',   value: '8',      change: '+3',   Icon: Users },
  { label: 'Proyectos activos', value: '5',   change: '+2',   Icon: Briefcase },
];

const RECENT_LEADS = [
  { id: '1', client: 'Pedro Gómez',       service: 'Diseño Web',     budget: '800€',   time: 'Hace 1h',  urgent: true },
  { id: '2', client: 'Lucía Fernández',   service: 'Consultoría SEO', budget: '500€',  time: 'Hace 3h',  urgent: false },
  { id: '3', client: 'Roberto Silva',     service: 'Desarrollo App',  budget: '3.000€', time: 'Ayer',    urgent: false },
];

const UPCOMING = [
  { id: '1', client: 'María López',  time: 'Hoy 14:00',    type: 'Revisión de proyecto' },
  { id: '2', client: 'Juan Torres',  time: 'Mañana 10:00', type: 'Primera reunión' },
];

export default function ProfessionalHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const firstName = user?.full_name?.split(' ')[0] || 'Profesional';

  return (
    <View className="flex-1 bg-background">
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

        {/* Stats — full-width rows */}
        <View className="gap-3">
          {STATS.map((stat) => (
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
                  <View className="flex-row items-center gap-0.5">
                    <ArrowUpRight size={12} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>{stat.change}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nuevos leads ── */}
        <View className="bg-surface rounded-2xl border border-border mb-5 overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <View>
              <Text className="text-base font-bold text-text">Nuevos leads</Text>
              <Text className="text-muted-text text-xs mt-0.5">{RECENT_LEADS.length} solicitudes pendientes</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(professional)/leads/available')}>
              <Text className="text-sm text-primary font-semibold">Ver todos</Text>
            </TouchableOpacity>
          </View>

          {RECENT_LEADS.map((lead, idx) => (
            <TouchableOpacity
              key={lead.id}
              onPress={() => router.push('/(professional)/leads/available')}
              activeOpacity={0.7}
              className={`flex-row items-center gap-3 px-5 py-4 ${idx < RECENT_LEADS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Avatar fallback={lead.client} size="sm" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold text-text text-sm" numberOfLines={1}>{lead.client}</Text>
                  {lead.urgent && (
                    <Badge label="Urgente" variant="error" size="sm" />
                  )}
                </View>
                <Text className="text-muted-text text-xs mt-0.5" numberOfLines={1}>{lead.service}</Text>
              </View>
              <View className="items-end" style={{ gap: 2 }}>
                <Text className="text-primary font-semibold text-sm">{lead.budget}</Text>
                <Text className="text-muted-text text-xs">{lead.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Próximas reuniones ── */}
        <View className="bg-surface rounded-2xl border border-border mb-5 overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border">
            <Text className="text-base font-bold text-text">Próximas reuniones</Text>
            <Calendar size={20} color="#6366F1" />
          </View>

          {UPCOMING.map((meet, idx) => (
            <View
              key={meet.id}
              className={`flex-row items-center gap-3 px-5 py-4 ${idx < UPCOMING.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Avatar fallback={meet.client} size="sm" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="font-semibold text-text text-sm" numberOfLines={1}>{meet.client}</Text>
                <Text className="text-muted-text text-xs mt-0.5">{meet.type}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Calendar size={13} color="#6366F1" />
                <Text className="text-primary font-semibold text-xs">{meet.time}</Text>
              </View>
            </View>
          ))}
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
      </ScrollView>
    </View>
  );
}
