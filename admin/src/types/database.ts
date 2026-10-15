export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          user_type: 'cliente' | 'professional' | 'admin';
          bio: string | null;
          is_verified: boolean;
          verified_at: string | null;
          expo_push_token: string | null;
          last_push_error: string | null;
          last_push_error_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          user_type?: string;
          bio?: string | null;
          is_verified?: boolean;
          verified_at?: string | null;
          expo_push_token?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          user_type?: string;
          bio?: string | null;
          is_verified?: boolean;
          verified_at?: string | null;
          expo_push_token?: string | null;
        };
      };
      professional_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string | null;
          company_type: 'autonomo' | 'empresa' | null;
          nif_cif: string | null;
          nif_cif_verified: boolean;
          documents_verified: boolean;
          description: string | null;
          experience_years: number | null;
          avg_rating: number | null;
          total_reviews: number;
          total_projects_completed: number;
          response_time_hours: number | null;
          location_city: string | null;
          location_region: string | null;
          location_country: string;
          service_radius_km: number | null;
          stripe_account_id: string | null;
          stripe_account_enabled: boolean;
          stripe_account_status: string;
          website_url: string | null;
          instagram_url: string | null;
          facebook_url: string | null;
          linkedin_url: string | null;
          hourly_rate: number | null;
          is_active: boolean;
          accepts_new_leads: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon_url?: string | null;
          is_active?: boolean;
        };
      };
      leads: {
        Row: {
          id: string;
          client_id: string;
          category_id: string;
          title: string;
          description: string;
          budget_min: number | null;
          budget_max: number | null;
          location_city: string | null;
          preferred_start_date: string | null;
          urgency: 'baja' | 'media' | 'alta';
          photos: Json;
          status: 'activo' | 'en_negociacion' | 'asignado' | 'cerrado' | 'cancelado';
          assigned_professional_id: string | null;
          is_featured: boolean;
          views_count: number;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          lead_id: string;
          professional_id: string;
          amount: number;
          currency: string;
          description: string;
          delivery_days: number;
          includes_materials: boolean;
          payment_terms: string | null;
          status: 'enviado' | 'visto' | 'aceptado' | 'rechazado' | 'expirado' | 'retirado';
          accepted_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          viewed_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      projects: {
        Row: {
          id: string;
          lead_id: string;
          quote_id: string | null;
          client_id: string;
          professional_id: string;
          category_id: string;
          title: string;
          description: string;
          agreed_price: number | null;
          currency: string;
          start_date: string | null;
          expected_end_date: string | null;
          actual_end_date: string | null;
          status: 'pendiente' | 'en_curso' | 'pendiente_finalizacion' | 'pausado' | 'completado' | 'cancelado';
          platform_commission_pct: number;
          platform_commission_amount: number | null;
          professional_receives: number | null;
          payment_status: 'pendiente' | 'pendiente_pago' | 'completado' | 'fallido' | 'reembolsado' | 'disputa';
          created_at: string;
          updated_at: string;
        };
      };
      reviews: {
        Row: {
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
          photos: Json;
          is_verified_purchase: boolean;
          helpful_count: number;
          is_hidden: boolean;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          project_id: string;
          client_id: string;
          professional_id: string;
          amount: number;
          gross_amount: number;
          currency: string;
          platform_commission_pct: number;
          commission_amount: number;
          professional_amount: number;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          status: 'procesando' | 'completado' | 'fallido' | 'reembolsado' | 'disputa';
          paid_at: string | null;
          error_message: string | null;
          created_at: string;
        };
      };
      commissions: {
        Row: {
          id: string;
          project_id: string;
          payment_id: string | null;
          professional_id: string;
          amount: number;
          pct: number;
          status: 'pendiente' | 'pagado' | 'reembolsado';
          created_at: string;
        };
      };
      verification_documents: {
        Row: {
          id: string;
          professional_id: string;
          document_type: 'nif_cif' | 'identificacion' | 'seguro_responsabilidad' | 'certificado_profesional' | 'licencia' | 'otro';
          file_path: string;
          status: 'pendiente' | 'aprobado' | 'rechazado';
          rejection_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          related_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
      };
      professional_categories: {
        Row: {
          professional_id: string;
          category_id: string;
          is_primary: boolean;
        };
      };
      portfolio_items: {
        Row: {
          id: string;
          professional_id: string;
          category_id: string;
          title: string;
          description: string | null;
          photos: Json;
          additional_photos: Json;
          client_location: string | null;
          is_featured: boolean;
          completed_at: string | null;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          sender_id: string;
          recipient_id: string;
          message_type: string;
          content: string;
          attachment_url: string | null;
          is_read: boolean;
          read_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
      };
      stripe_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          status: string;
          payload: Json;
          error: string | null;
          created_at: string;
        };
      };
    };
    Views: {
      professionals_with_categories: {
        Row: {
          id: string;
          user_id: string;
          company_name: string | null;
          company_type: string | null;
          description: string | null;
          experience_years: number | null;
          avg_rating: number | null;
          total_reviews: number;
          total_projects_completed: number;
          response_time_hours: number | null;
          location_city: string | null;
          location_region: string | null;
          service_radius_km: number | null;
          is_active: boolean;
          accepts_new_leads: boolean;
          hourly_rate: number | null;
          categories: Json;
        };
      };
      professional_trust_summary: {
        Row: {
          professional_id: string;
          nif_cif_verified: boolean;
          documents_verified: boolean;
          avg_rating: number | null;
          total_reviews: number;
          total_projects_completed: number;
          response_time_hours: number | null;
          experience_years: number | null;
          is_active: boolean;
          accepts_new_leads: boolean;
          is_fully_verified: boolean;
          approved_documents: number;
          pending_documents: number;
        };
      };
    };
    Functions: {
      log_admin_action: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
      admin_kpi_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_leads: number;
          leads_7d: number;
          leads_30d: number;
          leads_activos: number;
          total_quotes: number;
          quotes_aceptados: number;
          quotes_rechazados: number;
          quotes_pendientes: number;
          quote_acceptance_rate_pct: number;
          total_projects: number;
          projects_completados: number;
          projects_en_curso: number;
          project_completion_rate_pct: number;
          gmv: number;
          platform_commission: number;
          professional_earnings: number;
          payments_fallidos: number;
          payment_failure_rate_pct: number;
          total_reviews: number;
          avg_rating_global: number;
          total_professionals: number;
          total_clients: number;
          professionals_activos: number;
          professional_activation_rate_pct: number;
          clients_activos_30d: number;
          lead_to_project_rate_pct: number;
          lead_to_quote_rate_pct: number;
          avg_hours_to_first_quote: number;
          avg_quotes_per_lead: number;
        }[];
      };
      admin_conversion_funnel: {
        Args: Record<PropertyKey, never>;
        Returns: {
          etapa: string;
          cantidad: number;
          conversion_pct: number;
          perdidos: number;
        }[];
      };
      admin_daily_trend: {
        Args: Record<PropertyKey, never>;
        Returns: {
          date: string;
          leads_created: number;
          quotes_sent: number;
          quotes_accepted: number;
          projects_created: number;
          projects_completed: number;
          gmv: number;
          reviews_created: number;
          avg_rating: number | null;
        }[];
      };
    };
  };
}
