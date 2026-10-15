import { supabase } from './supabase';

export type TrustSummary = {
  professional_id: string;
  nif_cif_verified: boolean;
  documents_verified: boolean;
  avg_rating: number;
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

export type VerificationDocument = {
  id: string;
  professional_id: string;
  document_type: string;
  file_path: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export const verificationService = {
  async getTrustSummary(professionalId: string): Promise<TrustSummary | null> {
    const { data, error } = await supabase
      .from('professional_trust_summary')
      .select('*')
      .eq('professional_id', professionalId)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as TrustSummary;
  },

  async getMyDocuments(): Promise<VerificationDocument[]> {
    const { data, error } = await supabase
      .from('verification_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as VerificationDocument[];
  },

  async uploadDocument(
    professionalId: string,
    documentType: string,
    filePath: string,
  ): Promise<VerificationDocument> {
    const { data, error } = await supabase
      .from('verification_documents')
      .insert({
        professional_id: professionalId,
        document_type: documentType,
        file_path: filePath,
      })
      .select()
      .single();

    if (error) throw error;
    return data as VerificationDocument;
  },

  async deleteDocument(docId: string): Promise<void> {
    const { error } = await supabase
      .from('verification_documents')
      .delete()
      .eq('id', docId);

    if (error) throw error;
  },

  async getReviewStats(professionalId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating, is_verified_purchase, created_at')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const reviews = data ?? [];
    const verifiedCount = reviews.filter((r) => r.is_verified_purchase).length;

    return {
      total: reviews.length,
      verifiedCount,
      distribution: {
        1: reviews.filter((r) => r.rating === 1).length,
        2: reviews.filter((r) => r.rating === 2).length,
        3: reviews.filter((r) => r.rating === 3).length,
        4: reviews.filter((r) => r.rating === 4).length,
        5: reviews.filter((r) => r.rating === 5).length,
      },
      latest: reviews.slice(0, 3),
    };
  },
};
