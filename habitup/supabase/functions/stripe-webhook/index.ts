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

serve(async (req: Request) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error procesando webhook:', err);
    return new Response('Error interno', { status: 500 });
  }
});

// ── Handlers ──────────────────────────────────────────

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const { project_id } = intent.metadata;
  if (!project_id) return;

  // Actualizar payment a 'completado' — esto dispara el trigger
  // create_commission_on_payment que también marca el proyecto como completado
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'completado',
      paid_at: new Date().toISOString(),
      stripe_transfer_id: typeof intent.transfer_data?.destination === 'string'
        ? intent.transfer_data.destination
        : null,
    })
    .eq('stripe_payment_intent_id', intent.id);

  if (error) throw error;
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const { project_id } = intent.metadata;
  if (!project_id) return;

  await supabase
    .from('payments')
    .update({ status: 'fallido' })
    .eq('stripe_payment_intent_id', intent.id);

  await supabase
    .from('projects')
    .update({ payment_status: 'fallido' })
    .eq('id', project_id);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Actualizar si la cuenta Connect del profesional está habilitada para cobros
  const enabled =
    account.charges_enabled === true &&
    account.payouts_enabled === true;

  await supabase
    .from('professional_profiles')
    .update({ stripe_account_enabled: enabled })
    .eq('stripe_account_id', account.id);
}
