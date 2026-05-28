import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type Commission = Database['public']['Tables']['commissions']['Row'];

export default function Commissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Commission | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCommissions(data as unknown as Commission[]);
    setLoading(false);
  }

  async function handleMarkPaid(commission: Commission) {
    await (supabase.from('commissions') as any)
      .update({ status: 'pagado' })
      .eq('id', commission.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'mark_commission_paid',
      p_entity_type: 'commissions',
      p_entity_id: commission.id,
      p_details: { amount: commission.amount, project_id: commission.project_id },
    });
    load();
    setSelected(null);
  }

  const totalAmount = commissions
    .filter((c) => c.status === 'pendiente')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const columns = [
    {
      key: 'amount',
      header: 'Importe',
      render: (row: Commission) => (
        <span className="font-semibold text-slate-900">{row.amount.toLocaleString('es-ES')} €</span>
      ),
    },
    {
      key: 'pct',
      header: '%',
      render: (row: Commission) => `${row.pct}%`,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Commission) => <StatusBadge status={row.status} />,
    },
    {
      key: 'project_id',
      header: 'Proyecto',
      render: (row: Commission) => <span className="font-mono text-xs">{row.project_id.slice(0, 8)}…</span>,
    },
    {
      key: 'created_at',
      header: 'Creada',
      render: (row: Commission) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Comisiones</h1>
        <div className="rounded-lg bg-amber-50 px-4 py-2 text-sm">
          <span className="text-amber-600">Pendiente total: </span>
          <span className="font-bold text-amber-700">{totalAmount.toLocaleString('es-ES')} €</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={commissions}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de comisión" size="md">
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
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Porcentaje</p>
                <p className="mt-0.5 text-slate-700">{selected.pct}%</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Proyecto</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.project_id}</p>
              </div>
            </div>

            {selected.status === 'pendiente' && (
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={() => handleMarkPaid(selected)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  Marcar como pagado
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
