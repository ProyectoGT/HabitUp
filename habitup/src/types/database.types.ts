// =====================================================
// GENERATED TYPES — Supabase schema mirror
// Regenerar desde el schema real:
//   cd habitup
//   supabase gen types typescript --local > src/types/database.types.ts
//
// O contra remoto:
//   supabase gen types typescript \
//     --project-id "$EXPO_PUBLIC_SUPABASE_PROJECT_ID" \
//     > src/types/database.types.ts
// =====================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          user_type: string
          bio: string | null
          is_verified: boolean
          verified_at: string | null
          expo_push_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          user_type?: string
          bio?: string | null
          is_verified?: boolean
          verified_at?: string | null
          expo_push_token?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          user_type?: string
          bio?: string | null
          is_verified?: boolean
          verified_at?: string | null
          expo_push_token?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon_url?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon_url?: string | null
          is_active?: boolean
        }
      }
      professional_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          company_type: string | null
          nif_cif: string | null
          nif_cif_verified: boolean
          documents_verified: boolean
          description: string | null
          experience_years: number | null
          avg_rating: number
          total_reviews: number
          total_projects_completed: number
          response_time_hours: number | null
          location_city: string | null
          location_region: string | null
          location_country: string
          service_radius_km: number
          stripe_account_id: string | null
          stripe_account_enabled: boolean
          stripe_account_status: string
          website_url: string | null
          instagram_url: string | null
          facebook_url: string | null
          linkedin_url: string | null
          is_active: boolean
          accepts_new_leads: boolean
          hourly_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          company_type?: string | null
          nif_cif?: string | null
          nif_cif_verified?: boolean
          documents_verified?: boolean
          description?: string | null
          experience_years?: number | null
          avg_rating?: number
          total_reviews?: number
          total_projects_completed?: number
          response_time_hours?: number | null
          location_city?: string | null
          location_region?: string | null
          location_country?: string
          service_radius_km?: number
          stripe_account_id?: string | null
          stripe_account_enabled?: boolean
          stripe_account_status?: string
          website_url?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          linkedin_url?: string | null
          is_active?: boolean
          accepts_new_leads?: boolean
          hourly_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          company_type?: string | null
          nif_cif?: string | null
          nif_cif_verified?: boolean
          documents_verified?: boolean
          description?: string | null
          experience_years?: number | null
          avg_rating?: number
          total_reviews?: number
          total_projects_completed?: number
          response_time_hours?: number | null
          location_city?: string | null
          location_region?: string | null
          location_country?: string
          service_radius_km?: number
          stripe_account_id?: string | null
          stripe_account_enabled?: boolean
          stripe_account_status?: string
          website_url?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          linkedin_url?: string | null
          is_active?: boolean
          accepts_new_leads?: boolean
          hourly_rate?: number | null
        }
      }
      professional_categories: {
        Row: {
          professional_id: string
          category_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          professional_id: string
          category_id: string
          is_primary?: boolean
        }
        Update: {
          professional_id?: string
          category_id?: string
          is_primary?: boolean
        }
      }
      leads: {
        Row: {
          id: string
          client_id: string
          category_id: string
          title: string
          description: string
          budget_min: number | null
          budget_max: number | null
          location_city: string | null
          preferred_start_date: string | null
          urgency: string
          photos: string[]
          status: string
          assigned_professional_id: string | null
          is_featured: boolean
          views_count: number
          created_at: string
          updated_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          category_id: string
          title: string
          description: string
          budget_min?: number | null
          budget_max?: number | null
          location_city?: string | null
          preferred_start_date?: string | null
          urgency?: string
          photos?: string[]
          status?: string
          assigned_professional_id?: string | null
          is_featured?: boolean
          views_count?: number
          closed_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          category_id?: string
          title?: string
          description?: string
          budget_min?: number | null
          budget_max?: number | null
          location_city?: string | null
          preferred_start_date?: string | null
          urgency?: string
          photos?: string[]
          status?: string
          assigned_professional_id?: string | null
          is_featured?: boolean
          views_count?: number
          closed_at?: string | null
        }
      }
      quotes: {
        Row: {
          id: string
          lead_id: string
          professional_id: string
          amount: number
          currency: string
          description: string | null
          delivery_days: number | null
          includes_materials: boolean
          payment_terms: string | null
          status: string
          accepted_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          viewed_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          professional_id: string
          amount: number
          currency?: string
          description?: string | null
          delivery_days?: number | null
          includes_materials?: boolean
          payment_terms?: string | null
          status?: string
          accepted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          viewed_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          professional_id?: string
          amount?: number
          currency?: string
          description?: string | null
          delivery_days?: number | null
          includes_materials?: boolean
          payment_terms?: string | null
          status?: string
          accepted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          viewed_at?: string | null
          expires_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          lead_id: string | null
          quote_id: string | null
          client_id: string
          professional_id: string
          category_id: string
          title: string
          description: string | null
          agreed_price: number
          currency: string
          start_date: string | null
          expected_end_date: string | null
          actual_end_date: string | null
          status: string
          platform_commission_pct: number
          platform_commission_amount: number
          professional_receives: number
          payment_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          quote_id?: string | null
          client_id: string
          professional_id: string
          category_id: string
          title: string
          description?: string | null
          agreed_price: number
          currency?: string
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          status?: string
          platform_commission_pct?: number
          platform_commission_amount?: number
          professional_receives?: number
          payment_status?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          quote_id?: string | null
          client_id?: string
          professional_id?: string
          category_id?: string
          title?: string
          description?: string | null
          agreed_price?: number
          currency?: string
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          status?: string
          platform_commission_pct?: number
          platform_commission_amount?: number
          professional_receives?: number
          payment_status?: string
        }
      }
      conversations: {
        Row: {
          id: string
          client_id: string
          professional_id: string
          lead_id: string | null
          project_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          professional_id: string
          lead_id?: string | null
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          professional_id?: string
          lead_id?: string | null
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          project_id: string | null
          conversation_id: string
          sender_id: string
          recipient_id: string
          message_type: string
          content: string | null
          attachment_url: string | null
          is_read: boolean
          read_at: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          conversation_id: string
          sender_id: string
          recipient_id: string
          message_type?: string
          content?: string | null
          attachment_url?: string | null
          is_read?: boolean
          read_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          conversation_id?: string
          sender_id?: string
          recipient_id?: string
          message_type?: string
          content?: string | null
          attachment_url?: string | null
          is_read?: boolean
          read_at?: string | null
          deleted_at?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          project_id: string
          reviewer_id: string
          professional_id: string
          rating: number
          title: string | null
          comment: string | null
          rating_quality: number | null
          rating_communication: number | null
          rating_timeline: number | null
          rating_value: number | null
          photos: string[]
          is_verified_purchase: boolean
          helpful_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          reviewer_id: string
          professional_id: string
          rating: number
          title?: string | null
          comment?: string | null
          rating_quality?: number | null
          rating_communication?: number | null
          rating_timeline?: number | null
          rating_value?: number | null
          photos?: string[]
          is_verified_purchase?: boolean
          helpful_count?: number
        }
        Update: {
          id?: string
          project_id?: string
          reviewer_id?: string
          professional_id?: string
          rating?: number
          title?: string | null
          comment?: string | null
          rating_quality?: number | null
          rating_communication?: number | null
          rating_timeline?: number | null
          rating_value?: number | null
          photos?: string[]
          is_verified_purchase?: boolean
          helpful_count?: number
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string | null
          message: string | null
          related_id: string | null
          related_type: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title?: string | null
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string | null
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          is_read?: boolean
          read_at?: string | null
        }
      }
      portfolio_items: {
        Row: {
          id: string
          professional_id: string
          category_id: string | null
          title: string
          description: string | null
          photos: string[]
          additional_photos: string[]
          client_location: string | null
          is_featured: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          category_id?: string | null
          title: string
          description?: string | null
          photos?: string[]
          additional_photos?: string[]
          client_location?: string | null
          is_featured?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          professional_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          photos?: string[]
          additional_photos?: string[]
          client_location?: string | null
          is_featured?: boolean
          completed_at?: string | null
        }
      }
    }
    Views: {
      professionals_with_categories: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          company_type: string | null
          description: string | null
          experience_years: number | null
          avg_rating: number | null
          total_reviews: number | null
          total_projects_completed: number | null
          response_time_hours: number | null
          location_city: string | null
          location_region: string | null
          service_radius_km: number | null
          is_active: boolean | null
          accepts_new_leads: boolean | null
          nif_cif_verified: boolean | null
          documents_verified: boolean | null
          categories: Json
        }
      }
    }
    Functions: {
      accept_quote: {
        Args: {
          p_quote_id: string
        }
        Returns: {
          id: string
          lead_id: string | null
          quote_id: string | null
          client_id: string
          professional_id: string
          category_id: string
          title: string
          description: string | null
          agreed_price: number
          currency: string
          start_date: string | null
          expected_end_date: string | null
          actual_end_date: string | null
          status: string
          platform_commission_pct: number
          platform_commission_amount: number
          professional_receives: number
          payment_status: string
          created_at: string
          updated_at: string
        }[]
      }
      get_or_create_project_conversation: {
        Args: {
          p_project_id: string
        }
        Returns: {
          id: string
          client_id: string
          professional_id: string
          lead_id: string | null
          project_id: string | null
          created_at: string
          updated_at: string
        }[]
      }
      get_or_create_lead_conversation: {
        Args: {
          p_lead_id: string
          p_professional_id: string
        }
        Returns: {
          id: string
          client_id: string
          professional_id: string
          lead_id: string | null
          project_id: string | null
          created_at: string
          updated_at: string
        }[]
      }
      record_app_error: {
        Args: {
          p_message: string
          p_level?: string
          p_code?: string | null
          p_stack?: string | null
          p_context?: Json | null
          p_correlation_id?: string | null
        }
        Returns: undefined
      }
      record_app_event: {
        Args: {
          p_event_name: string
          p_properties?: Json | null
          p_correlation_id?: string | null
        }
        Returns: undefined
      }
      current_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      admin_kpi_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      admin_conversion_funnel: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
      admin_daily_trend: {
        Args: Record<PropertyKey, never>
        Returns: Json[]
      }
    }
    Enums: Record<string, never>
  }
}
