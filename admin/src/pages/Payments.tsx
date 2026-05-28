import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type Payment = Database['public']['Tables']['payments']['Row'];

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPayments(data as unknown as Payment[]);
    setLoading(false);
  }

  const columns = [
    {
      key: 'amount',
      header: 'Importe',
      render: (row: Payment) => (
        <span className="font-semibold text-slate-900">{row.amount.toLocaleString('es-ES')} €</span>
      ),
    },
    {
      key: 'gross_amount',
      header: 'Bruto',
      render: (row: Payment) => `${row.gross_amount.toLocaleString('es-ES')} €`,
    },
    {
      key: 'commission_amount',
      header: 'Comisión',
      render: (row: Payment) => `${row.commission_amount.toLocaleString('es-ES')} €`,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Payment) => <StatusBadge status={row.status} />,
    },
    {
      key: 'stripe_payment_intent_id',
      header: 'Stripe ID',
      render: (row: Payment) => (
        <span className="font-mono text-xs text-slate-500">{row.stripe_payment_intent_id?.slice(0, 16) ?? '—'}…</span>
      ),
    },
    {
      key: 'paid_at',
      header: 'Pagado',
      render: (row: Payment) =>
        row.paid_at ? new Date(row.paid_at).toLocaleDateString('es-ES') : '—',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Pagos</h1>
      <DataTable
        columns={columns}
        data={payments}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del pago" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Moneda</p>
                <p className="mt-0.5 uppercase text-slate-700">{selected.currency}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Importe neto</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selected.amount.toLocaleString('es-ES')} €
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Importe bruto</p>
                <p className="mt-0.5 text-slate-700">{selected.gross_amount.toLocaleString('es-ES')} €</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Comisión ({selected.platform_commission_pct}%)</p>
                <p className="mt-0.5 text-slate-700">{selected.commission_amount.toLocaleString('es-ES')} €</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Profesional recibe</p>
                <p className="mt-0.5 text-slate-700">{selected.professional_amount.toLocaleString('es-ES')} €</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Proyecto</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.project_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Stripe PaymentIntent</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">
                  {selected.stripe_payment_intent_id ?? '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
