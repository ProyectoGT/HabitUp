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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const payload: PushPayload = await req.json();

    if (!payload.token || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'token, title y body son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Solo enviar a tokens Expo válidos
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

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    // Loggear errores de Expo (token inválido, etc.) pero no fallar
    if (result?.data?.status === 'error') {
      console.error('Expo push error:', result.data.message);
    }

    return new Response(JSON.stringify({ ok: true, expo: result }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
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
