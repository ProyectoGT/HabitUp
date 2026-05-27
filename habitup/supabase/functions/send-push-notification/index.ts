import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  channelId?: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  channelId?: string;
  priority: 'default' | 'normal' | 'high';
}

const PUSH_SECRET = Deno.env.get('PUSH_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-push-secret',
      },
    });
  }

  // ── Validate shared secret ───────────────────────────────
  // The X-Push-Secret header must match the configured secret.
  // This is the ONLY entry point for push sending – any caller
  // without the secret is rejected.
  const providedSecret = req.headers.get('X-Push-Secret');
  if (!PUSH_SECRET || providedSecret !== PUSH_SECRET) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const payload: PushPayload = await req.json();

    if (!payload.token || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'token, title y body son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Reject non-Expo tokens early
    if (!payload.token.startsWith('ExponentPushToken[')) {
      return new Response(
        JSON.stringify({ skipped: 'token no es un Expo Push Token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const message: ExpoMessage = {
      to: payload.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: payload.badge,
      sound: payload.sound ?? 'default',
      channelId: payload.channelId ?? 'default',
      priority: 'high',
    };

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const expoResult = await expoRes.json();

    // ── Handle Expo delivery errors ─────────────────────────
    // Expo returns an array in data, one entry per pushed token.
    const pushStatus = expoResult?.data?.[0]?.status;
    const pushMessage = expoResult?.data?.[0]?.message;

    if (pushStatus === 'error') {
      console.error('Expo push error:', pushMessage);

      // If the token is invalid, ask the DB to flag this user
      const isInvalidToken = pushMessage?.includes('Invalid') ||
        pushMessage?.includes('Not Registered');

      if (isInvalidToken && payload.data?.userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const userId = payload.data.userId as string;
        // Fire-and-forget: call record_push_error so future pushes skip this user
        fetch(`${SUPABASE_URL}/rest/v1/rpc/record_push_error`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ p_user_id: userId, p_error: 'ExpoInvalidToken' }),
        }).catch(() => null);
      }

      return new Response(
        JSON.stringify({ ok: false, error: pushMessage }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('send-push-notification error:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
