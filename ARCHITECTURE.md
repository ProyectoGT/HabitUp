# Architecture

## Frontend

La app usa Expo Router con grupos por dominio:

- `(auth)`: login, registro y onboarding inicial.
- `(client)`: experiencia cliente.
- `(professional)`: experiencia profesional.
- `chat/[projectId]`: conversacion de proyecto.

La UI reutilizable vive en `habitup/src/components`:

- `ui`: `Button`, `Input`, `Card`, `Badge`, `Avatar`, `Screen`.
- `leads`: tarjetas de solicitudes.
- `professionals`: tarjetas de profesionales.
- `chat`: burbujas e input.

## Estado

Zustand gestiona:

- sesion y perfil actual en `authStore`.
- notificaciones en `notificationStore`.

Los datos de negocio se cargan desde servicios Supabase y hooks ligeros.

## Servicios

- `auth.service.ts`
- `professionals.service.ts`
- `leads.service.ts`
- `quotes.service.ts`
- `projects.service.ts`
- `messages.service.ts`
- `reviews.service.ts`
- `notifications.service.ts`
- `payments.service.ts`
- `analytics.service.ts`

Regla: las pantallas orquestan UI y navegacion; los servicios contienen operaciones de negocio.

## Backend Supabase

El backend usa:

- Supabase Auth.
- Tabla publica `users` como perfil espejo.
- `professional_profiles` para datos profesionales.
- `leads`, `quotes`, `projects`, `messages`, `reviews`.
- RLS en todas las tablas relevantes.
- RPC `accept_quote` para aceptar presupuesto de forma transaccional.
- Triggers para `updated_at`, rating y notificaciones.

## Decisiones

### `users` vs `profiles`

El briefing propone `profiles`, pero el repo ya usa `users` como espejo de `auth.users`. Para no romper el producto, el MVP mantiene `users` y documenta la equivalencia:

- `users` = perfil base.
- `professional_profiles` = extension profesional.

Una migracion futura podria renombrar o crear una vista `profiles`.

### Chat Sin `conversations`

El MVP usa `messages.project_id` directamente. Es suficiente para proyectos aceptados y reduce complejidad. Si se quiere chat previo a aceptacion, se anadira `conversations` con `lead_id` opcional.

### Pagos

Stripe existe como preparacion, pero el MVP no depende de pagos. La app no debe bloquear la demo si falta `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## Eventos

`trackEvent(eventName, properties)` actualmente hace `console.log` en desarrollo y deja preparada la integracion con PostHog, Segment o analitica propia.

Eventos implementados/parcialmente preparados:

- `user_signed_up`
- `role_selected`
- `professional_onboarding_completed`
- `lead_published`
- `quote_sent`
- `quote_accepted`
- `project_created`
- `message_sent`
- `review_created`
