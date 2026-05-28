import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Briefcase, FileText, CreditCard, ShieldCheck, Star,
  TrendingUp, DollarSign, Percent, Activity
} from 'lucide-react';

interface Kpi {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
}

interface DailyRow {
  date: string;
  leads_created: number;
  quotes_sent: number;
  quotes_accepted: number;
  projects_created: number;
  projects_completed: number;
  gmv: number;
  reviews_created: number;
  avg_rating: number | null;
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [funnel, setFunnel] = useState<{ etapa: string; cantidad: number; conversion_pct: number }[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: kpiData } = await supabase
        .from('kpi_overview' as any)
        .select('*')
        .limit(1)
        .single();

      const { data: funnelData } = await supabase
        .from('conversion_funnel' as any)
        .select('*');

      const { data: dailyData } = await supabase
        .from('daily_trend' as any)
        .select('*')
        .order('date' as any, { ascending: false })
        .limit(14);

      if (kpiData) {
        const d = kpiData as any;
        setKpis([
          {
            label: 'Leads totales',
            value: d.total_leads,
            icon: <FileText size={20} />,
            color: 'bg-blue-50 text-blue-600',
            sublabel: `${d.leads_7d} en 7d · ${d.leads_activos} activos`,
          },
          {
            label: 'Presupuestos',
            value: d.total_quotes,
            icon: <TrendingUp size={20} />,
            color: 'bg-amber-50 text-amber-600',
            sublabel: `${d.quote_acceptance_rate_pct}% aceptación · ${d.avg_quotes_per_lead}/lead`,
          },
          {
            label: 'Proyectos',
            value: d.total_projects,
            icon: <Briefcase size={20} />,
            color: 'bg-purple-50 text-purple-600',
            sublabel: `${d.projects_completados} completados · ${d.project_completion_rate_pct}% tasa`,
          },
          {
            label: 'GMV',
            value: `${Number(d.gmv).toLocaleString('es-ES')} €`,
            icon: <DollarSign size={20} />,
            color: 'bg-emerald-50 text-emerald-600',
            sublabel: `${Number(d.platform_commission).toLocaleString('es-ES')} € en comisiones`,
          },
          {
            label: 'Conversión lead → project',
            value: `${d.lead_to_project_rate_pct}%`,
            icon: <Activity size={20} />,
            color: 'bg-cyan-50 text-cyan-600',
            sublabel: `${d.avg_hours_to_first_quote}h media hasta primer quote`,
          },
          {
            label: 'Usuarios activos',
            value: `${d.professionals_activos} prof · ${d.clients_activos_30d} cli`,
            icon: <Users size={20} />,
            color: 'bg-rose-50 text-rose-600',
            sublabel: `${d.total_professionals} profesionales totales · ${d.total_clients} clientes`,
          },
          {
            label: 'Rating medio',
            value: d.avg_rating_global,
            icon: <Star size={20} />,
            color: 'bg-yellow-50 text-yellow-600',
            sublabel: `${d.total_reviews} reseñas`,
          },
          {
            label: 'Pagos fallidos',
            value: `${d.payments_fallidos} (${d.payment_failure_rate_pct}%)`,
            icon: <Percent size={20} />,
            color: d.payments_fallidos > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
          },
        ]);
      }

      if (funnelData) setFunnel(funnelData as any);
      if (dailyData) setDaily(dailyData as any);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 truncate">{kpi.value}</p>
                {kpi.sublabel && (
                  <p className="mt-1 text-xs text-slate-400 truncate">{kpi.sublabel}</p>
                )}
              </div>
              <div className={`ml-3 shrink-0 rounded-lg p-3 ${kpi.color}`}>{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Funnel de conversión</h2>
          <div className="space-y-3">
            {funnel.map((row, i) => {
              const pct = Number(row.conversion_pct);
              return (
                <div key={row.etapa}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{row.etapa}</span>
                    <span className="font-medium text-slate-900">
                      {row.cantidad} <span className="text-xs text-slate-400">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        i === 0 ? 'bg-blue-500' :
                        i === 1 ? 'bg-cyan-500' :
                        i === 2 ? 'bg-amber-500' :
                        i === 3 ? 'bg-purple-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Últimos 14 días</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Día</th>
                  <th className="pb-2 pr-3 font-medium">Leads</th>
                  <th className="pb-2 pr-3 font-medium">Quotes</th>
                  <th className="pb-2 pr-3 font-medium">Proyectos</th>
                  <th className="pb-2 pr-3 font-medium">GMV</th>
                  <th className="pb-2 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {daily.map((row) => (
                  <tr key={row.date} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      {new Date(row.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2 pr-3">{row.leads_created}</td>
                    <td className="py-2 pr-3">{row.quotes_sent}</td>
                    <td className="py-2 pr-3">{row.projects_created}</td>
                    <td className="py-2 pr-3 font-medium">{row.gmv.toLocaleString('es-ES')} €</td>
                    <td className="py-2">{row.avg_rating ? `${row.avg_rating}★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
