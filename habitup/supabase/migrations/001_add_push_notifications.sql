-- =====================================================
-- MIGRACIÓN 001: Push notifications
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema principal
-- =====================================================

-- 1. Extensión pg_net para llamadas HTTP desde triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Columna para el Expo Push Token en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- =====================================================
-- FUNCIÓN HELPER: enviar push via Edge Function
-- Llama a send-push-notification con payload JSON.
-- No bloquea el trigger si falla (EXCEPTION silenciosa).
-- =====================================================

CREATE OR REPLACE FUNCTION call_send_push(
  p_user_id  UUID,
  p_type     TEXT,
  p_title    TEXT,
  p_body     TEXT,
  p_data     JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  v_token TEXT;
  -- Valores hardcodeados del proyecto (no requieren ALTER DATABASE)
  v_edge_url  CONSTANT TEXT := 'https://jcdllwourpwltaqdobxs.supabase.co/functions/v1/send-push-notification';
  v_anon_key  CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGxsd291cnB3bHRhcWRvYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDc3OTIsImV4cCI6MjA5MjcyMzc5Mn0.wHNCoH-SiPl5hz5Z4TSzQKSGT7Va3jztIBc-xXC_Ayk';
BEGIN
  -- Obtener token del usuario destinatario
  SELECT expo_push_token INTO v_token FROM users WHERE id = p_user_id;
  IF v_token IS NULL THEN
    RETURN; -- Sin token, nada que hacer
  END IF;

  PERFORM net.http_post(
    url     => v_edge_url,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    => jsonb_build_object(
      'token', v_token,
      'title', p_title,
      'body',  p_body,
      'data',  p_data || jsonb_build_object('type', p_type, 'userId', p_user_id)
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- No bloquear la transacción si el push falla
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS DE PUSH (usan la función call_send_push)
-- =====================================================

-- Push: nuevo presupuesto recibido (al cliente)
CREATE OR REPLACE FUNCTION push_on_new_quote()
RETURNS TRIGGER AS $$
DECLARE v_client_id UUID; v_pro_name TEXT;
BEGIN
  SELECT l.client_id, u.full_name
    INTO v_client_id, v_pro_name
  FROM leads l
  JOIN professional_profiles pp ON pp.id = NEW.professional_id
  JOIN users u ON u.id = pp.user_id
  WHERE l.id = NEW.lead_id;

  PERFORM call_send_push(
    v_client_id,
    'new_quote',
    'Nuevo presupuesto',
    v_pro_name || ' ha enviado un presupuesto para tu solicitud',
    jsonb_build_object('leadId', NEW.lead_id, 'quoteId', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_push_new_quote
AFTER INSERT ON quotes
FOR EACH ROW EXECUTE FUNCTION push_on_new_quote();

-- Push: presupuesto aceptado (al profesional)
CREATE OR REPLACE FUNCTION push_on_quote_accepted()
RETURNS TRIGGER AS $$
DECLARE v_pro_user_id UUID; v_client_name TEXT;
BEGIN
  IF NEW.status = 'aceptado' AND OLD.status <> 'aceptado' THEN
    SELECT pp.user_id, u.full_name
      INTO v_pro_user_id, v_client_name
    FROM professional_profiles pp
    JOIN leads l ON l.id = NEW.lead_id
    JOIN users u ON u.id = l.client_id
    WHERE pp.id = NEW.professional_id;

    PERFORM call_send_push(
      v_pro_user_id,
      'quote_accepted',
      'Presupuesto aceptado 🎉',
      v_client_name || ' ha aceptado tu presupuesto. ¡Enhorabuena!',
      jsonb_build_object('quoteId', NEW.id, 'leadId', NEW.lead_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_push_quote_accepted
AFTER UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION push_on_quote_accepted();

-- Push: nuevo mensaje en el chat
CREATE OR REPLACE FUNCTION push_on_new_message()
RETURNS TRIGGER AS $$
DECLARE v_sender_name TEXT;
BEGIN
  SELECT full_name INTO v_sender_name FROM users WHERE id = NEW.sender_id;

  PERFORM call_send_push(
    NEW.recipient_id,
    'new_message',
    v_sender_name,
    COALESCE(LEFT(NEW.content, 80), 'Nuevo mensaje'),
    jsonb_build_object('projectId', NEW.project_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_push_new_message
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.message_type = 'text')
EXECUTE FUNCTION push_on_new_message();

-- Push: proyecto marcado como completado (al cliente)
CREATE OR REPLACE FUNCTION push_on_project_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status <> 'completado' THEN
    PERFORM call_send_push(
      NEW.client_id,
      'project_completed',
      'Proyecto completado ✅',
      'Tu proyecto ha sido marcado como completado. ¡Deja tu reseña!',
      jsonb_build_object('projectId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_push_project_completed
AFTER UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION push_on_project_completed();
