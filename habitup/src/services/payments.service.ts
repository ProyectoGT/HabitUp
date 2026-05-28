import { ENV } from '@/config/env';
import { supabase } from './supabase';

export const paymentsService = {
  async createPaymentIntent(projectId: string): Promise<string> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('No autenticado');

    const response = await fetch(
      `${ENV.SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Error al crear el pago');
    return data.client_secret as string;
  },

  // Inicia el onboarding de Stripe Connect para el profesional
  async createConnectAccountLink(): Promise<{ url: string; account_id: string }> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('No autenticado');

    const response = await fetch(
      `${ENV.SUPABASE_URL}/functions/v1/create-connect-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Error al conectar con Stripe');
    return data as { url: string; account_id: string };
  },
};
