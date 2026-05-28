import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { Plus, Pencil } from 'lucide-react';
import type { Database } from '../types/database';

type Category = Database['public']['Tables']['categories']['Row'];

const emptyForm = { name: '', slug: '', description: '', is_active: true };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (data) setCategories(data as unknown as Category[]);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      is_active: cat.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);

    if (editing) {
      await (supabase.from('categories') as any)
        .update({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        })
        .eq('id', editing.id);
      await (supabase.rpc as any)('log_admin_action', {
        p_action: 'update_category',
        p_entity_type: 'categories',
        p_entity_id: editing.id,
        p_details: { name: form.name.trim() },
      });
    } else {
      await (supabase.from('categories') as any).insert({
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      });
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleToggleActive(cat: Category) {
    await (supabase.from('categories') as any)
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    await (supabase.rpc as any)('log_admin_action', {
      p_action: cat.is_active ? 'deactivate_category' : 'activate_category',
      p_entity_type: 'categories',
      p_entity_id: cat.id,
      p_details: { name: cat.name },
    });
    load();
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'is_active',
      header: 'Activa',
      render: (row: Category) => <StatusBadge status={row.is_active} />,
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (row: Category) => (
        <span className="max-w-[300px] truncate text-xs text-slate-500">
          {row.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row: Category) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
            className={`rounded p-1 ${
              row.is_active
                ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                : 'text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
          >
            {row.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Categorías</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva categoría
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        searchKeys={['name', 'slug', 'description']}
        onRowClick={(row) => openEdit(row)}
        loading={loading}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">Activa</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.slug.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
