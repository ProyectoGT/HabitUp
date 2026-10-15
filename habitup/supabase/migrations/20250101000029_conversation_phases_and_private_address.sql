-- =====================================================
-- MIGRATION 029: Fases de conversación y dirección protegida
--
-- EL ANDAMIO DE 5 NIVELES
--   1 contacto      → cliente escribe al profesional
--   2 presupuestada → el profesional ha emitido un presupuesto
--   3 aceptada      → el cliente lo acepta. SE DESBLOQUEA LA DIRECCIÓN.
--   4 en_obra       → trabajo en marcha
--   5 entregada     → trabajo entregado y pagado
--   (+ descartada, que puede ocurrir desde cualquier fase)
--
-- POR QUÉ LA DIRECCIÓN VA EN OTRA TABLA
--   RLS en Postgres filtra FILAS, no columnas. Si la dirección viviera en
--   `conversations`, cualquier política que dejara al profesional leer la
--   conversación le dejaría leer también la dirección. Separándola, la regla
--   "solo a partir de fase aceptada" se convierte en una policy de verdad
--   y no en un `if` del cliente que se puede saltar llamando a la API.
-- =====================================================

-- ---------- Fase ----------
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'contacto'
    CHECK (status IN ('contacto','presupuestada','aceptada','en_obra','entregada','descartada')),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS property_city TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx
  ON conversations(last_message_at DESC NULLS LAST);

-- Si ya hay proyecto, la conversación no puede seguir en 'contacto'.
UPDATE conversations
   SET status = 'en_obra'
 WHERE project_id IS NOT NULL
   AND status = 'contacto';

-- ---------- Transiciones válidas ----------
-- Sin esto, cualquier participante podría saltar de 'contacto' a 'entregada'
-- y desbloquear la dirección sin pasar por el presupuesto.
CREATE OR REPLACE FUNCTION public.enforce_conversation_phase()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- 'descartada' es siempre alcanzable: cualquiera puede abandonar.
  IF NEW.status = 'descartada' THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'contacto'      AND NEW.status = 'presupuestada')
    OR (OLD.status = 'presupuestada' AND NEW.status IN ('contacto','aceptada'))
    OR (OLD.status = 'aceptada'      AND NEW.status = 'en_obra')
    OR (OLD.status = 'en_obra'       AND NEW.status = 'entregada')
    OR (OLD.status = 'descartada'    AND NEW.status = 'contacto')
  ) THEN
    RAISE EXCEPTION 'Transicion de fase no permitida: % -> %', OLD.status, NEW.status
      USING HINT = 'invalid_phase_transition';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_phase ON conversations;
CREATE TRIGGER trg_conversation_phase
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_phase();

-- ---------- Datos sensibles del inmueble ----------
CREATE TABLE IF NOT EXISTS conversation_property_details (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  address_line     TEXT,
  postal_code      TEXT,
  city             TEXT,
  access_notes     TEXT,   -- portal, piso, codigo, "el perro ladra pero no muerde"
  contact_phone    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_conv_details_updated_at ON conversation_property_details;
CREATE TRIGGER trg_conv_details_updated_at
  BEFORE UPDATE ON conversation_property_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE conversation_property_details ENABLE ROW LEVEL SECURITY;

-- El cliente ve y edita SIEMPRE los datos de su propio inmueble.
DROP POLICY IF EXISTS "detalles: cliente gestiona" ON conversation_property_details;
CREATE POLICY "detalles: cliente gestiona"
ON conversation_property_details FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_property_details.conversation_id
      AND c.client_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_property_details.conversation_id
      AND c.client_id = auth.uid()
  )
);

-- El profesional SOLO a partir de que el presupuesto está aceptado.
-- Esta es la regla de privacidad del producto, y vive aquí.
DROP POLICY IF EXISTS "detalles: profesional tras aceptacion" ON conversation_property_details;
CREATE POLICY "detalles: profesional tras aceptacion"
ON conversation_property_details FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM conversations c
    JOIN professional_profiles pp ON pp.id = c.professional_id
    WHERE c.id = conversation_property_details.conversation_id
      AND pp.user_id = auth.uid()
      AND c.status IN ('aceptada','en_obra','entregada')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_property_details TO authenticated;

-- ---------- Mantener last_message_at al día ----------
CREATE OR REPLACE FUNCTION public.touch_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation ON messages;
CREATE TRIGGER trg_touch_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION public.touch_conversation_last_message();

COMMENT ON TABLE conversation_property_details IS
  'Datos sensibles del inmueble. El profesional solo los ve a partir de la fase aceptada. Separado de conversations porque RLS filtra filas, no columnas.';
