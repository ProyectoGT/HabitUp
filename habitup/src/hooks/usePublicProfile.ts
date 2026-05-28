import { useEffect, useState } from 'react';
import { professionalsService } from '@/services/professionals.service';
import { verificationService, type TrustSummary } from '@/services/verification.service';
import { portfolioService } from '@/services/portfolio.service';
import type { ProfessionalProfileWithUser, Category, PortfolioItem } from '@/types/models';

export type PublicProfile = {
  profile: ProfessionalProfileWithUser | null;
  trustSummary: TrustSummary | null;
  categories: Category[];
  portfolioItems: PortfolioItem[];
  isLoading: boolean;
  error: string | null;
};

export function usePublicProfile(professionalId: string): PublicProfile {
  const [profile, setProfile] = useState<ProfessionalProfileWithUser | null>(null);
  const [trustSummary, setTrustSummary] = useState<TrustSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!professionalId) return;

    Promise.all([
      professionalsService.getProfileById(professionalId),
      verificationService.getTrustSummary(professionalId),
      professionalsService.getMyCategories(professionalId),
      portfolioService.getByProfessional(professionalId).catch(() => []),
    ])
      .then(([prof, trust, cats, items]) => {
        setProfile(prof);
        setTrustSummary(trust);
        setCategories(cats);
        setPortfolioItems(items);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error al cargar perfil');
      })
      .finally(() => setIsLoading(false));
  }, [professionalId]);

  return {
    profile,
    trustSummary,
    categories,
    portfolioItems,
    isLoading,
    error,
  };
}

export function getTrustLevel(summary: TrustSummary | null): 'verified' | 'partial' | 'pending' | 'none' {
  if (!summary) return 'none';

  const { nif_cif_verified, documents_verified, total_reviews } = summary;

  if (nif_cif_verified && documents_verified && total_reviews > 0) return 'verified';
  if (nif_cif_verified || documents_verified) return 'partial';
  return 'pending';
}
