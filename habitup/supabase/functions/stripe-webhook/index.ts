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

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

serve(async (req: Request) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  let payload: Record<string, unknown>;

  // 1. Verify signature
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    payload = JSON.parse(body);
  } catch (err) {
    console.error('Stripe webhook: signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`Stripe webhook: received event ${event.id} (${event.type})`);

  // 2. Idempotency — try to record event; if already exists, skip
  try {
    const { error: insertError } = await supabase
      .from('stripe_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Stripe webhook: duplicate event ${event.id} (${event.type}), skipping`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw insertError;
    }
  } catch (err) {
    console.error(`Stripe webhook: failed to record event ${event.id}:`, err);
    return new Response('Internal server error', { status: 500 });
  }

  // 3. Process event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Stripe webhook: unhandled event type ${event.type}`);
    }

    // 4. Mark as processed (or skipped for unknown types)
    const HANDLED_EVENTS = [
      'payment_intent.succeeded', 'payment_intent.payment_failed',
      'payment_intent.canceled',
      'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed',
      'account.updated',
    ];
    const finalStatus = HANDLED_EVENTS.includes(event.type)
      ? 'processed'
      : 'skipped';

    await supabase
      .from('stripe_events')
      .update({ status: finalStatus, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    console.log(`Stripe webhook: event ${event.id} (${event.type}) → ${finalStatus}`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Stripe webhook: error processing event ${event.id} (${event.type}):`, errorMessage);

    await supabase
      .from('stripe_events')
      .update({
        status: 'failed',
        error: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id);

    return new Response('Internal server error', { status: 500 });
  }
});

// ── Handlers ──────────────────────────────────────────

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const projectId = intent.metadata.project_id;
  if (!projectId) {
    console.warn(`Stripe webhook: payment_intent.succeeded ${intent.id} missing project_id in metadata`);
    return;
  }

  // Actualizar payments.status (dispara trigger create_commission_on_payment)
  const { error: payError } = await supabase
    .from('payments')
    .update({
      status: 'completado',
      paid_at: new Date().toISOString(),
      stripe_transfer_id: typeof intent.transfer_data?.destination === 'string'
        ? intent.transfer_data.destination
        : null,
    })
    .eq('stripe_payment_intent_id', intent.id);

  if (payError) {
    console.error(`Stripe webhook: failed to update payment ${intent.id}:`, payError.message);
    throw payError;
  }

  // Actualizar SOLO estado financiero del proyecto (no toca projects.status)
  const { error: projError } = await supabase
    .from('projects')
    .update({ payment_status: 'completado' })
    .eq('id', projectId);

  if (projError) {
    console.error(`Stripe webhook: failed to update project ${projectId} payment_status:`, projError.message);
    throw projError;
  }

  console.log(`Stripe webhook: payment ${intent.id} completado, project ${projectId} payment_status → completado`);
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const projectId = intent.metadata.project_id;
  if (!projectId) {
    console.warn(`Stripe webhook: payment_intent.payment_failed ${intent.id} missing project_id in metadata`);
    return;
  }

  const { error: paymentError } = await supabase
    .from('payments')
    .update({ status: 'fallido' })
    .eq('stripe_payment_intent_id', intent.id);

  if (paymentError) {
    console.error(`Stripe webhook: failed to update payment status to fallido:`, paymentError.message);
  }

  const { error: projectError } = await supabase
    .from('projects')
    .update({ payment_status: 'fallido' })
    .eq('id', projectId);

  if (projectError) {
    console.error(`Stripe webhook: failed to update project ${projectId} payment_status:`, projectError.message);
  }

  if (paymentError || projectError) {
    throw paymentError ?? projectError;
  }

  console.log(`Stripe webhook: payment ${intent.id} marked as fallido, project ${projectId} updated`);
}

async function handlePaymentCanceled(intent: Stripe.PaymentIntent) {
  const projectId = intent.metadata.project_id;
  if (!projectId) {
    console.warn(`Stripe webhook: payment_intent.canceled ${intent.id} missing project_id in metadata`);
    return;
  }

  await supabase
    .from('payments')
    .update({ status: 'fallido' })
    .eq('stripe_payment_intent_id', intent.id);

  // Reabrir posibilidad de pago — cliente puede reintentar
  await supabase
    .from('projects')
    .update({ payment_status: 'pendiente' })
    .eq('id', projectId);

  console.log(`Stripe webhook: payment ${intent.id} canceled, project ${projectId} payment_status → pendiente`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const intentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!intentId) {
    console.warn('Stripe webhook: charge.refunded missing payment_intent');
    return;
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('project_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (!payment) {
    console.warn(`Stripe webhook: charge.refunded no payment found for intent ${intentId}`);
    return;
  }

  await supabase
    .from('payments')
    .update({ status: 'reembolsado' })
    .eq('stripe_payment_intent_id', intentId);

  await supabase
    .from('projects')
    .update({ payment_status: 'reembolsado' })
    .eq('id', payment.project_id);

  console.log(`Stripe webhook: charge refunded for intent ${intentId}, project ${payment.project_id} → reembolsado`);
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const intentId = dispute.payment_intent?.id;
  if (!intentId) {
    console.warn('Stripe webhook: dispute.created missing payment_intent');
    return;
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('project_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (!payment) {
    console.warn(`Stripe webhook: dispute.created no payment found for intent ${intentId}`);
    return;
  }

  await supabase
    .from('payments')
    .update({ status: 'disputa' })
    .eq('stripe_payment_intent_id', intentId);

  await supabase
    .from('projects')
    .update({ payment_status: 'disputa' })
    .eq('id', payment.project_id);

  console.log(`Stripe webhook: dispute created for intent ${intentId}, project ${payment.project_id} → disputa`);
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  const intentId = dispute.payment_intent?.id;
  if (!intentId) {
    console.warn('Stripe webhook: dispute.closed missing payment_intent');
    return;
  }

  // 'won' → Stripe ruled in platform's favor, restore payment
  // 'lost' → payment was reversed
  const resolution = dispute.status === 'won' ? 'completado' : 'reembolsado';

  const { data: payment } = await supabase
    .from('payments')
    .select('project_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();

  if (!payment) {
    console.warn(`Stripe webhook: dispute.closed no payment found for intent ${intentId}`);
    return;
  }

  await supabase
    .from('payments')
    .update({ status: resolution })
    .eq('stripe_payment_intent_id', intentId);

  await supabase
    .from('projects')
    .update({ payment_status: resolution })
    .eq('id', payment.project_id);

  console.log(`Stripe webhook: dispute closed for intent ${intentId}, resolution ${resolution}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  const chargesOk = account.charges_enabled === true;
  const payoutsOk = account.payouts_enabled === true;
  const enabled = chargesOk && payoutsOk;

  // Derivar estado granular desde el objeto Account
  let status: string;
  if (chargesOk && payoutsOk && account.details_submitted) {
    status = 'active';
  } else if (account.requirements?.disabled_reason !== null) {
    status = 'disabled';
  } else if (account.requirements?.past_due && account.requirements.past_due.length > 0) {
    status = 'restricted';
  } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
    status = 'pending';
  } else if (account.details_submitted) {
    // details submitted pero aun no activo — Stripe esta revisando
    status = 'pending';
  } else {
    status = 'pending';
  }

  const { error } = await supabase
    .from('professional_profiles')
    .update({
      stripe_account_enabled: enabled,
      stripe_account_status: status,
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error(`Stripe webhook: failed to update account ${account.id}:`, error.message);
    throw error;
  }

  console.log(`Stripe webhook: account ${account.id} → enabled=${enabled}, status=${status}`);
}
