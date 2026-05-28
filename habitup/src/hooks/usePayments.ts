import { useState, useCallback } from 'react';
import { paymentsService } from '@/services/payments.service';

export function usePayments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = useCallback(async (projectId: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await paymentsService.createPaymentIntent(projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar el pago');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConnectAccountLink = useCallback(async (): Promise<{ url: string; account_id: string } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await paymentsService.createConnectAccountLink();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con Stripe');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createPaymentIntent,
    createConnectAccountLink,
  };
}
