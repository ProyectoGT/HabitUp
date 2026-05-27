import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

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

  try {
    // Autenticar usuario desde el JWT de Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return json({ error: 'Token inválido' }, 401);

    const { project_id } = await req.json();
    if (!project_id) return json({ error: 'project_id requerido' }, 400);

    // Obtener el proyecto con el perfil del profesional
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select(`
        *,
        professional:professional_profiles!professional_id(
          stripe_account_id,
          stripe_account_enabled
        )
      `)
      .eq('id', project_id)
      .eq('client_id', user.id)
      .single();

    if (projError || !project) return json({ error: 'Proyecto no encontrado' }, 404);
    if (!['pendiente'].includes(project.payment_status)) {
      return json({ error: 'Este proyecto ya tiene un pago iniciado o completado' }, 400);
    }

    const professional = project.professional as {
      stripe_account_id: string | null;
      stripe_account_enabled: boolean;
    };

    if (!professional?.stripe_account_id || !professional?.stripe_account_enabled) {
      return json({ error: 'El profesional aún no ha configurado su cuenta de cobro' }, 400);
    }

    const amountCents = Math.round(project.agreed_price * 100);
    const commissionCents = Math.round(project.platform_commission_amount * 100);

    // Crear PaymentIntent con transferencia automática al profesional
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      application_fee_amount: commissionCents,
      transfer_data: {
        destination: professional.stripe_account_id,
      },
      metadata: {
        project_id,
        client_id: user.id,
        professional_stripe_account: professional.stripe_account_id,
      },
    });

    // Registrar el pago en Supabase con estado 'en_proceso'
    const { error: paymentError } = await supabase.from('payments').upsert({
      project_id,
      client_id: user.id,
      professional_id: project.professional_id,
      amount: project.agreed_price,
      currency: 'EUR',
      gross_amount: project.agreed_price,
      commission_amount: project.platform_commission_amount,
      professional_amount: project.professional_receives,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'procesando',
    }, { onConflict: 'stripe_payment_intent_id' });

    if (paymentError) throw paymentError;

    // Actualizar payment_status del proyecto
    await supabase
      .from('projects')
      .update({ payment_status: 'pendiente_pago' })
      .eq('id', project_id);

    return json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return json({ error: 'Error interno del servidor' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
