const statusColors: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  en_negociacion: 'bg-amber-100 text-amber-700',
  asignado: 'bg-blue-100 text-blue-700',
  cerrado: 'bg-slate-100 text-slate-600',
  cancelado: 'bg-red-100 text-red-700',
  enviado: 'bg-blue-100 text-blue-700',
  visto: 'bg-amber-100 text-amber-700',
  aceptado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  expirado: 'bg-slate-100 text-slate-500',
  retirado: 'bg-red-100 text-red-700',
  pendiente: 'bg-amber-100 text-amber-700',
  en_curso: 'bg-blue-100 text-blue-700',
  pendiente_finalizacion: 'bg-purple-100 text-purple-700',
  pausado: 'bg-slate-100 text-slate-600',
  completado: 'bg-emerald-100 text-emerald-700',
  procesando: 'bg-amber-100 text-amber-700',
  fallido: 'bg-red-100 text-red-700',
  reembolsado: 'bg-orange-100 text-orange-700',
  disputa: 'bg-red-100 text-red-700',
  pendiente_pago: 'bg-amber-100 text-amber-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazado_doc: 'bg-red-100 text-red-700',
  pagado: 'bg-emerald-100 text-emerald-700',
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-red-100 text-red-700',
  cliente: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  admin: 'bg-rose-100 text-rose-700',
  true: 'bg-emerald-100 text-emerald-700',
  false: 'bg-slate-100 text-slate-500',
};

export function StatusBadge({ status }: { status: string | boolean | null | undefined }) {
  const key = status == null ? 'null' : String(status);
  const colorClass = statusColors[key] ?? 'bg-slate-100 text-slate-600';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {formatLabel(key)}
    </span>
  );
}

function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    activo: 'Activo',
    en_negociacion: 'En negociación',
    asignado: 'Asignado',
    cerrado: 'Cerrado',
    cancelado: 'Cancelado',
    enviado: 'Enviado',
    visto: 'Visto',
    aceptado: 'Aceptado',
    rechazado: 'Rechazado',
    expirado: 'Expirado',
    retirado: 'Retirado',
    pendiente: 'Pendiente',
    en_curso: 'En curso',
    pendiente_finalizacion: 'Pendiente finalización',
    pausado: 'Pausado',
    completado: 'Completado',
    procesando: 'Procesando',
    fallido: 'Fallido',
    reembolsado: 'Reembolsado',
    disputa: 'Disputa',
    pendiente_pago: 'Pendiente pago',
    aprobado: 'Aprobado',
    rechazado_doc: 'Rechazado',
    pagado: 'Pagado',
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    cliente: 'Cliente',
    professional: 'Profesional',
    admin: 'Admin',
    true: 'Sí',
    false: 'No',
  };
  return labels[key] ?? key;
}
