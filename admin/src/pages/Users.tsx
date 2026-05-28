import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Database } from '../types/database';

type User = Database['public']['Tables']['users']['Row'];
type Professional = Database['public']['Tables']['professional_profiles']['Row'];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data as unknown as User[]);
    setLoading(false);
  }

  async function openUserDetail(user: User) {
    setSelectedUser(user);
    if (user.user_type === 'professional') {
      const { data } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfessional(data as unknown as Professional | null);
    } else {
      setProfessional(null);
    }
  }

  async function handleToggleVerify(user: User) {
    await (supabase.from('users') as any)
      .update({ is_verified: !user.is_verified, verified_at: user.is_verified ? null : new Date().toISOString() })
      .eq('id', user.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: user.is_verified ? 'unverify_user' : 'verify_user',
      p_entity_type: 'users',
      p_entity_id: user.id,
      p_details: { previous: user.is_verified, new: !user.is_verified },
    });
    loadUsers();
    setSelectedUser(null);
  }

  async function handleChangeType(user: User, newType: string) {
    await (supabase.from('users') as any).update({ user_type: newType }).eq('id', user.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'change_user_type',
      p_entity_type: 'users',
      p_entity_id: user.id,
      p_details: { from: user.user_type, to: newType },
    });
    loadUsers();
    setSelectedUser(null);
  }

  const columns = [
    {
      key: 'full_name',
      header: 'Nombre',
      render: (row: User) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
            {row.full_name?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.full_name}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'user_type',
      header: 'Tipo',
      render: (row: User) => <StatusBadge status={row.user_type} />,
    },
    {
      key: 'is_verified',
      header: 'Verificado',
      render: (row: User) => <StatusBadge status={row.is_verified} />,
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (row: User) => row.phone ?? '—',
    },
    {
      key: 'created_at',
      header: 'Registro',
      render: (row: User) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Usuarios</h1>

      <DataTable
        columns={columns}
        data={users}
        searchKeys={['full_name', 'email', 'phone']}
        onRowClick={(row) => openUserDetail(row)}
        loading={loading}
      />

      <Modal
        open={!!selectedUser}
        onClose={() => { setSelectedUser(null); setProfessional(null); }}
        title={`Usuario: ${selectedUser?.full_name}`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ID</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-0.5 text-slate-700">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Teléfono</p>
                <p className="mt-0.5 text-slate-700">{selectedUser.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo</p>
                <p className="mt-0.5">
                  <StatusBadge status={selectedUser.user_type} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Verificado</p>
                <p className="mt-0.5">
                  <StatusBadge status={selectedUser.is_verified} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Registro</p>
                <p className="mt-0.5 text-slate-700">
                  {new Date(selectedUser.created_at).toLocaleString('es-ES')}
                </p>
              </div>
            </div>

            {professional && (
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Perfil profesional</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Empresa</p>
                    <p className="mt-0.5 text-slate-700">{professional.company_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="mt-0.5 text-slate-700">{professional.company_type ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">NIF/CIF</p>
                    <p className="mt-0.5 font-mono text-slate-700">{professional.nif_cif ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">NIF verificado</p>
                    <p className="mt-0.5">
                      <StatusBadge status={professional.nif_cif_verified} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Docs verificados</p>
                    <p className="mt-0.5">
                      <StatusBadge status={professional.documents_verified} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Rating</p>
                    <p className="mt-0.5 text-slate-700">
                      {professional.avg_rating ? `${professional.avg_rating.toFixed(1)} ★` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Ubicación</p>
                    <p className="mt-0.5 text-slate-700">
                      {[professional.location_city, professional.location_region]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Stripe</p>
                    <p className="mt-0.5">
                      <StatusBadge status={professional.stripe_account_status} />
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => handleToggleVerify(selectedUser)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {selectedUser.is_verified ? 'Quitar verificación' : 'Verificar usuario'}
              </button>

              {selectedUser.user_type !== 'admin' && (
                <button
                  onClick={() => handleChangeType(selectedUser, 'admin')}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  Convertir en admin
                </button>
              )}

              {selectedUser.user_type === 'admin' && (
                <button
                  onClick={() => handleChangeType(selectedUser, 'cliente')}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Quitar admin
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
