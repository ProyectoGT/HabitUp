import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Eye, EyeOff } from 'lucide-react';
import type { Database } from '../types/database';

type Review = Database['public']['Tables']['reviews']['Row'];

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReviews(data as unknown as Review[]);
    setLoading(false);
  }

  async function handleToggleHide(review: Review) {
    await (supabase.from('reviews') as any)
      .update({ is_hidden: !review.is_hidden })
      .eq('id', review.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: review.is_hidden ? 'unhide_review' : 'hide_review',
      p_entity_type: 'reviews',
      p_entity_id: review.id,
      p_details: { was_hidden: review.is_hidden, now_hidden: !review.is_hidden },
    });
    load();
    setSelected(null);
  }

  const columns = [
    {
      key: 'rating',
      header: 'Rating',
      render: (row: Review) => (
        <span className="font-semibold text-amber-500">{'★'.repeat(row.rating)}{'☆'.repeat(5 - row.rating)}</span>
      ),
    },
    {
      key: 'title',
      header: 'Título',
      render: (row: Review) => (
        <div className="flex items-center gap-2">
          <span className={row.is_hidden ? 'text-slate-400 line-through' : ''}>
            {row.title ?? '—'}
          </span>
          {row.is_hidden && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">Oculta</span>
          )}
        </div>
      ),
    },
    {
      key: 'professional_id',
      header: 'Profesional',
      render: (row: Review) => <span className="font-mono text-xs">{row.professional_id.slice(0, 8)}…</span>,
    },
    {
      key: 'is_verified_purchase',
      header: 'Compra verificada',
      render: (row: Review) => <StatusBadge status={row.is_verified_purchase} />,
    },
    {
      key: 'created_at',
      header: 'Fecha',
      render: (row: Review) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Reseñas</h1>
        <button
          onClick={() => load()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Recargar
        </button>
      </div>

      <DataTable
        columns={columns}
        data={reviews}
        searchKeys={['title', 'comment']}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de reseña" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rating</p>
                <p className="mt-0.5 text-lg text-amber-500">
                  {'★'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Verificada</p>
                <p className="mt-0.5"><StatusBadge status={selected.is_verified_purchase} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Oculta</p>
                <p className="mt-0.5"><StatusBadge status={selected.is_hidden} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Proyecto</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.project_id}</p>
              </div>
            </div>

            {selected.rating_quality && (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded bg-slate-50 p-2">
                  <p className="text-slate-400">Calidad</p>
                  <p className="font-semibold">{selected.rating_quality}/5</p>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <p className="text-slate-400">Comunicación</p>
                  <p className="font-semibold">{selected.rating_communication}/5</p>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <p className="text-slate-400">Plazos</p>
                  <p className="font-semibold">{selected.rating_timeline}/5</p>
                </div>
                <div className="rounded bg-slate-50 p-2">
                  <p className="text-slate-400">Valor</p>
                  <p className="font-semibold">{selected.rating_value}/5</p>
                </div>
              </div>
            )}

            {selected.title && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Título</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selected.title}</p>
              </div>
            )}

            {selected.comment && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Comentario</p>
                <p className="mt-1 text-sm text-slate-700">{selected.comment}</p>
              </div>
            )}

            <div className="flex gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => handleToggleHide(selected)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selected.is_hidden
                    ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {selected.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                {selected.is_hidden ? 'Mostrar reseña' : 'Ocultar reseña'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
