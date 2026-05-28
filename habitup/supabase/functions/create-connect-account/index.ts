import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { log, setCorrelationId } from '../_shared/logging.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  setCorrelationId(crypto.randomUUID());

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return json({ error: 'Token inválido' }, 401);

    // Obtener el perfil profesional
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, stripe_account_id, location_country')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) return json({ error: 'Perfil profesional no encontrado' }, 404);

    let accountId = profile.stripe_account_id as string | null;

    // Crear cuenta Connect si no existe aún
    if (!accountId) {
      const { data: userData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: userData?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { supabase_user_id: user.id, professional_profile_id: profile.id },
      });

      accountId = account.id;

      // Guardar el account id y marcar pending
      await supabase
        .from('professional_profiles')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending',
        })
        .eq('id', profile.id);
    }

    // Generar enlace de onboarding (válido 10 minutos)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-connect-account`,
      return_url: 'habitup://profile',
      type: 'account_onboarding',
    });

    log.info('connect-account success', { userId: user.id, accountId });
    return json({ url: accountLink.url, account_id: accountId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('create-connect-account error', { error: msg });
    return json({ error: 'Error interno del servidor' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
