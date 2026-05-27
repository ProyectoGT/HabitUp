import type { Database } from './database.types';

// ═════════════════════════════════════════════════════════
// Table types — derivados de Database (fuente de verdad)
// ═════════════════════════════════════════════════════════

export type User = Database['public']['Tables']['users']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type ProfessionalProfile = Database['public']['Tables']['professional_profiles']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Quote = Database['public']['Tables']['quotes']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// ═════════════════════════════════════════════════════════
// Insert / Update helpers
// ═════════════════════════════════════════════════════════

export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// ═════════════════════════════════════════════════════════
// Domain enum types — añaden valor semántico sobre strings
// ═════════════════════════════════════════════════════════

import {
  USER_TYPES,
  LEAD_STATUS,
  QUOTE_STATUS,
  PROJECT_STATUS,
  PAYMENT_STATUS,
  URGENCY,
} from '@/utils/constants';

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type Urgency = (typeof URGENCY)[keyof typeof URGENCY];

// ═════════════════════════════════════════════════════════
// DTOs — formas de consulta comunes (joins, proyecciones)
// ═════════════════════════════════════════════════════════

export type LeadWithCategory = Lead & {
  categories: Pick<Category, 'name' | 'slug'> | null;
};

export type LeadWithCategoryAndClient = Lead & {
  categories: Pick<Category, 'name' | 'slug'> | null;
  users: Pick<User, 'full_name' | 'avatar_url'> | null;
};

export type ProfessionalProfileWithUser = ProfessionalProfile & {
  users: Pick<User, 'full_name' | 'avatar_url'> | null;
};

export type QuoteWithProfile = Quote & {
  professional_profiles: {
    company_name: string | null;
    avg_rating: number | null;
    location_city: string | null;
    users: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
};

export type ProjectWithDetails = Project & {
  categories: { name: string } | null;
  client?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  professional?: {
    id: string;
    company_name: string | null;
    user_id: string;
    users: { full_name: string | null; avatar_url: string | null };
  };
};

export type ReviewWithUser = Review & {
  users: Pick<User, 'full_name' | 'avatar_url'> | null;
};
