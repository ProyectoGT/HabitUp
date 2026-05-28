import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type Quote = Database['public']['Tables']['quotes']['Row'];

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quote | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setQuotes(data as unknown as Quote[]);
    setLoading(false);
  }

  const columns = [
    {
      key: 'amount',
      header: 'Importe',
      render: (row: Quote) => `${row.amount.toLocaleString('es-ES')} €`,
    },
    {
      key: 'professional_id',
      header: 'Profesional',
      render: (row: Quote) => <span className="font-mono text-xs">{row.professional_id.slice(0, 8)}…</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Quote) => <StatusBadge status={row.status} />,
    },
    {
      key: 'delivery_days',
      header: 'Plazo',
      render: (row: Quote) => `${row.delivery_days} días`,
    },
    {
      key: 'includes_materials',
      header: 'Materiales',
      render: (row: Quote) => (row.includes_materials ? 'Sí' : 'No'),
    },
    {
      key: 'created_at',
      header: 'Enviado',
      render: (row: Quote) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Presupuestos</h1>
      <DataTable
        columns={columns}
        data={quotes}
        searchKeys={['description']}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del presupuesto" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Importe</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selected.amount.toLocaleString('es-ES')} €
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lead ID</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.lead_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Profesional</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.professional_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Plazo</p>
                <p className="mt-0.5 text-slate-700">{selected.delivery_days} días</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Incluye materiales</p>
                <p className="mt-0.5">{selected.includes_materials ? 'Sí' : 'No'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Descripción</p>
              <p className="mt-1 text-sm text-slate-700">{selected.description}</p>
            </div>
            {selected.rejection_reason && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="text-xs font-medium uppercase tracking-wide text-red-500">Motivo de rechazo</p>
                <p className="mt-1">{selected.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
