import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import type { Database } from '../types/database';

type Doc = Database['public']['Tables']['verification_documents']['Row'];

const DOC_LABELS: Record<string, string> = {
  nif_cif: 'NIF/CIF',
  identificacion: 'Identificación',
  seguro_responsabilidad: 'Seguro responsabilidad',
  certificado_profesional: 'Certificado profesional',
  licencia: 'Licencia',
  otro: 'Otro',
};

export default function Verification() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    const { data } = await supabase
      .from('verification_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDocs(data as unknown as Doc[]);
    setLoading(false);
  }

  async function handleApprove(doc: Doc) {
    await (supabase.from('verification_documents') as any)
      .update({ status: 'aprobado', reviewed_at: new Date().toISOString() })
      .eq('id', doc.id);

    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'approve_document',
      p_entity_type: 'verification_documents',
      p_entity_id: doc.id,
      p_details: { document_type: doc.document_type, professional_id: doc.professional_id },
    });
    loadDocs();
    setSelectedDoc(null);
  }

  async function handleReject(doc: Doc) {
    if (!rejectionReason.trim()) return;

    await (supabase.from('verification_documents') as any)
      .update({
        status: 'rechazado',
        rejection_reason: rejectionReason.trim(),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    await (supabase.rpc as any)('log_admin_action', {
      p_action: 'reject_document',
      p_entity_type: 'verification_documents',
      p_entity_id: doc.id,
      p_details: { document_type: doc.document_type, professional_id: doc.professional_id, reason: rejectionReason.trim() },
    });
    loadDocs();
    setSelectedDoc(null);
    setRejectionReason('');
  }

  async function getFileUrl(filePath: string) {
    const { data } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(filePath, 300);
    return data?.signedUrl;
  }

  const columns = [
    {
      key: 'document_type',
      header: 'Tipo',
      render: (row: Doc) => (
        <span className="font-medium text-slate-700">{DOC_LABELS[row.document_type] ?? row.document_type}</span>
      ),
    },
    {
      key: 'professional_id',
      header: 'Profesional',
      render: (row: Doc) => (
        <span className="font-mono text-xs">{row.professional_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Doc) => <StatusBadge status={row.status === 'rechazado' ? 'rechazado_doc' : row.status} />,
    },
    {
      key: 'rejection_reason',
      header: 'Motivo',
      render: (row: Doc) => (
        <span className="max-w-[200px] truncate text-xs text-slate-500">
          {row.rejection_reason ?? '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Subido',
      render: (row: Doc) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Verificación documental</h1>
        <div className="flex gap-2">
          <button
            onClick={() => loadDocs()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={docs}
        onRowClick={(row) => setSelectedDoc(row)}
        loading={loading}
      />

      <Modal
        open={!!selectedDoc}
        onClose={() => { setSelectedDoc(null); setRejectionReason(''); }}
        title={`Documento: ${selectedDoc ? DOC_LABELS[selectedDoc.document_type] ?? selectedDoc.document_type : ''}`}
        size="lg"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5">
                  <StatusBadge status={selectedDoc.status === 'rechazado' ? 'rechazado_doc' : selectedDoc.status} />
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo</p>
                <p className="mt-0.5 text-slate-700">
                  {DOC_LABELS[selectedDoc.document_type] ?? selectedDoc.document_type}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Subido</p>
                <p className="mt-0.5 text-slate-700">
                  {new Date(selectedDoc.created_at).toLocaleString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Profesional ID</p>
                <p className="mt-0.5 font-mono text-xs text-slate-700">{selectedDoc.professional_id}</p>
              </div>
            </div>

            <button
              onClick={async () => {
                const url = await getFileUrl(selectedDoc.file_path);
                if (url) window.open(url, '_blank');
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={14} />
              Ver documento
            </button>

            {selectedDoc.rejection_reason && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="text-xs font-medium uppercase tracking-wide text-red-500">Motivo de rechazo</p>
                <p className="mt-1">{selectedDoc.rejection_reason}</p>
              </div>
            )}

            {selectedDoc.status === 'pendiente' && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Motivo de rechazo (obligatorio si se rechaza)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Describe qué falta o qué está incorrecto..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(selectedDoc)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={16} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(selectedDoc)}
                    disabled={!rejectionReason.trim()}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={16} />
                    Rechazar
                  </button>
                </div>
              </div>
            )}

            {selectedDoc.status !== 'pendiente' && (
              <div className="text-xs text-slate-400">
                Revisado el {selectedDoc.reviewed_at ? new Date(selectedDoc.reviewed_at).toLocaleString('es-ES') : '—'}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
