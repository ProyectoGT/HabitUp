import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type Lead = Database['public']['Tables']['leads']['Row'];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLeads(data as unknown as Lead[]);
    setLoading(false);
  }

  async function handleClose(lead: Lead) {
    await (supabase.from('leads') as any)
      .update({ status: 'cerrado', closed_at: new Date().toISOString() })
      .eq('id', lead.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'close_lead',
      p_entity_type: 'leads',
      p_entity_id: lead.id,
      p_details: { previous_status: lead.status },
    });
    load();
    setSelected(null);
  }

  const columns = [
    { key: 'title', header: 'Título' },
    {
      key: 'client_id',
      header: 'Cliente',
      render: (row: Lead) => <span className="font-mono text-xs">{row.client_id.slice(0, 8)}…</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Lead) => <StatusBadge status={row.status} />,
    },
    {
      key: 'urgency',
      header: 'Urgencia',
      render: (row: Lead) => <StatusBadge status={row.urgency} />,
    },
    {
      key: 'budget_min',
      header: 'Presupuesto',
      render: (row: Lead) => {
        if (!row.budget_min && !row.budget_max) return '—';
        return `${row.budget_min ?? '?'}€ – ${row.budget_max ?? '?'}€`;
      },
    },
    {
      key: 'created_at',
      header: 'Creado',
      render: (row: Lead) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Leads</h1>

      <DataTable
        columns={columns}
        data={leads}
        searchKeys={['title', 'description', 'client_id']}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Lead: ${selected?.title}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Urgencia</p>
                <p className="mt-0.5"><StatusBadge status={selected.urgency} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.client_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ubicación</p>
                <p className="mt-0.5 text-slate-700">{selected.location_city ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Presupuesto</p>
                <p className="mt-0.5 text-slate-700">
                  {selected.budget_min ?? '?'}€ – {selected.budget_max ?? '?'}€
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Creado</p>
                <p className="mt-0.5 text-slate-700">{new Date(selected.created_at).toLocaleString('es-ES')}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Descripción</p>
              <p className="mt-1 text-sm text-slate-700">{selected.description}</p>
            </div>

            {selected.status !== 'cerrado' && selected.status !== 'cancelado' && (
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={() => handleClose(selected)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Cerrar lead
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
