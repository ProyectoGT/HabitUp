export const USER_TYPES = {
  CLIENT: 'cliente',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin',
} as const;

export const LEAD_STATUS = {
  ACTIVE: 'activo',
  NEGOTIATING: 'en_negociacion',
  ASSIGNED: 'asignado',
  CLOSED: 'cerrado',
  CANCELLED: 'cancelado',
} as const;

export const QUOTE_STATUS = {
  SENT: 'enviado',
  SEEN: 'visto',
  ACCEPTED: 'aceptado',
  REJECTED: 'rechazado',
  EXPIRED: 'expirado',
} as const;

export const PROJECT_STATUS = {
  PENDING: 'pendiente',
  IN_PROGRESS: 'en_curso',
  PENDING_COMPLETION: 'pendiente_finalizacion',
  PAUSED: 'pausado',
  COMPLETED: 'completado',
  CANCELLED: 'cancelado',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pendiente',
  PROCESSING: 'en_proceso',
  COMPLETED: 'completado',
  FAILED: 'fallido',
} as const;

export const URGENCY = {
  LOW: 'baja',
  MEDIUM: 'media',
  HIGH: 'alta',
} as const;

export const PLATFORM_COMMISSION_PCT = 10;

export const NOTIFICATION_TYPES = {
  NEW_QUOTE: 'new_quote',
  QUOTE_ACCEPTED: 'quote_accepted',
  PROJECT_STARTED: 'project_started',
  PAYMENT_RECEIVED: 'payment_received',
  NEW_MESSAGE: 'new_message',
  REVIEW_RECEIVED: 'review_received',
} as const;
