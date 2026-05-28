import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectStatus = Project['status'];

const STATUS_FLOW: ProjectStatus[] = [
  'pendiente',
  'en_curso',
  'pendiente_finalizacion',
  'completado',
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProjects(data as unknown as Project[]);
    setLoading(false);
  }

  async function handleStatusChange(project: Project, newStatus: ProjectStatus) {
    await (supabase.from('projects') as any).update({ status: newStatus }).eq('id', project.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'change_project_status',
      p_entity_type: 'projects',
      p_entity_id: project.id,
      p_details: { from: project.status, to: newStatus },
    });
    load();
    setSelected(null);
  }

  async function handleCancel(project: Project) {
    await (supabase.from('projects') as any).update({ status: 'cancelado' }).eq('id', project.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'cancel_project',
      p_entity_type: 'projects',
      p_entity_id: project.id,
      p_details: { previous_status: project.status },
    });
    load();
    setSelected(null);
  }

  const columns = [
    { key: 'title', header: 'Título' },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Project) => <StatusBadge status={row.status} />,
    },
    {
      key: 'payment_status',
      header: 'Pago',
      render: (row: Project) => <StatusBadge status={row.payment_status} />,
    },
    {
      key: 'agreed_price',
      header: 'Importe',
      render: (row: Project) =>
        row.agreed_price != null ? `${row.agreed_price.toLocaleString('es-ES')} €` : '—',
    },
    {
      key: 'client_id',
      header: 'Cliente',
      render: (row: Project) => <span className="font-mono text-xs">{row.client_id.slice(0, 8)}…</span>,
    },
    {
      key: 'created_at',
      header: 'Creado',
      render: (row: Project) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Proyectos</h1>

      <DataTable
        columns={columns}
        data={projects}
        searchKeys={['title', 'description']}
        onRowClick={(row) => setSelected(row)}
        loading={loading}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Proyecto: ${selected?.title}`} size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5"><StatusBadge status={selected.status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pago</p>
                <p className="mt-0.5"><StatusBadge status={selected.payment_status} /></p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Importe</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {selected.agreed_price != null ? `${selected.agreed_price.toLocaleString('es-ES')} €` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Comisión</p>
                <p className="mt-0.5 text-slate-700">{selected.platform_commission_pct}%</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.client_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Profesional</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selected.professional_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Inicio</p>
                <p className="mt-0.5 text-slate-700">
                  {selected.start_date ? new Date(selected.start_date).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fin esperado</p>
                <p className="mt-0.5 text-slate-700">
                  {selected.expected_end_date ? new Date(selected.expected_end_date).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fin real</p>
                <p className="mt-0.5 text-slate-700">
                  {selected.actual_end_date ? new Date(selected.actual_end_date).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
            </div>

            {selected.status !== 'cancelado' && selected.status !== 'completado' && (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                {STATUS_FLOW.indexOf(selected.status) < STATUS_FLOW.length - 1 && (
                  <button
                    onClick={() =>
                      handleStatusChange(
                        selected,
                        STATUS_FLOW[STATUS_FLOW.indexOf(selected.status) + 1]
                      )
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Avanzar a{' '}
                    {STATUS_FLOW[STATUS_FLOW.indexOf(selected.status) + 1].replace(/_/g, ' ')}
                  </button>
                )}
                <button
                  onClick={() => handleCancel(selected)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                >
                  Cancelar proyecto
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
