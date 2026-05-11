import type {
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

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  user_type: UserType;
  bio: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  users?: {
    full_name: string;
    avatar_url: string | null;
  };
  company_name: string | null;
  company_type: 'autonomo' | 'empresa' | null;
  nif_cif: string | null;
  nif_cif_verified: boolean;
  description: string | null;
  experience_years: number | null;
  avg_rating: number;
  total_reviews: number;
  total_projects_completed: number;
  response_time_hours: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string;
  service_radius_km: number;
  stripe_account_id: string | null;
  stripe_account_enabled: boolean;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  is_active: boolean;
  accepts_new_leads: boolean;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  location_city: string | null;
  preferred_start_date: string | null;
  urgency: Urgency;
  photos: string[];
  status: LeadStatus;
  assigned_professional_id: string | null;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface Quote {
  id: string;
  lead_id: string;
  professional_id: string;
  amount: number;
  currency: string;
  description: string | null;
  delivery_days: number | null;
  includes_materials: boolean;
  payment_terms: string | null;
  status: QuoteStatus;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  viewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  lead_id: string | null;
  quote_id: string | null;
  client_id: string;
  professional_id: string;
  category_id: string;
  title: string;
  description: string | null;
  agreed_price: number;
  currency: string;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  status: ProjectStatus;
  platform_commission_pct: number;
  platform_commission_amount: number;
  professional_receives: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  recipient_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  content: string | null;
  attachment_url: string | null;
  is_read: boolean;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  professional_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  rating_quality: number | null;
  rating_communication: number | null;
  rating_timeline: number | null;
  rating_value: number | null;
  photos: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  message: string | null;
  related_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
