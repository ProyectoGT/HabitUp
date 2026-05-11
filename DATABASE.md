# Database

## Tablas Principales

### users

Perfil base sincronizado con `auth.users`.

Campos clave: `id`, `email`, `full_name`, `phone`, `avatar_url`, `user_type`, `is_verified`, `created_at`, `updated_at`.

### professional_profiles

Extension para profesionales.

Campos clave: `user_id`, `company_name`, `description`, `experience_years`, `avg_rating`, `total_reviews`, `location_city`, `location_region`, `service_radius_km`, `accepts_new_leads`, `stripe_account_id`.

### categories

Catalogo de servicios. La migracion `002_mvp_core_loop.sql` inserta categorias iniciales.

### professional_categories

Relacion N:M entre profesionales y categorias.

### leads

Solicitud publicada por un cliente.

Estados actuales:

- `activo`
- `en_negociacion`
- `asignado`
- `cerrado`
- `cancelado`

### quotes

Presupuesto de un profesional sobre un lead.

Estados actuales:

- `enviado`
- `visto`
- `aceptado`
- `rechazado`
- `expirado`
- `retirado`

### projects

Proyecto creado al aceptar un presupuesto.

Estados actuales:

- `pendiente`
- `en_curso`
- `pendiente_finalizacion`
- `pausado`
- `completado`
- `cancelado`

### messages

Mensajes de chat por proyecto.

### reviews

Resenas verificadas. Solo el cliente de un proyecto completado puede crear una resena.

### notifications

Notificaciones in-app.

## RPC Importantes

### accept_quote(p_quote_id UUID)

Hace de forma transaccional:

1. Valida que el usuario actual sea el cliente del lead.
2. Valida que el presupuesto pueda aceptarse.
3. Marca quote aceptada.
4. Rechaza otras quotes activas del lead.
5. Marca lead como asignado.
6. Crea project.
7. Notifica al profesional.
8. Devuelve `project_id`.

## Migraciones

Orden recomendado:

1. `supabase/habitup_schema.sql` si la base esta vacia.
2. `habitup/supabase/migrations/001_add_push_notifications.sql`.
3. `habitup/supabase/migrations/002_mvp_core_loop.sql`.

## Storage Futuro

Buckets previstos:

- `lead-photos`
- `portfolio`
- `verification-documents`

Reglas esperadas:

- Lead photos: cliente propietario puede subir y ver; profesionales solo ven tras reglas del lead.
- Portfolio: profesional propietario escribe, lectura publica limitada.
- Verification documents: solo profesional propietario y admin/Edge Functions.
