# HabitUp - Contexto Canonico Para Agentes

Este archivo es la fuente canonica para trabajar en HabitUp. Si contradice prompts antiguos o documentacion historica, manda este archivo junto con las migraciones reales.

## Producto

HabitUp es un marketplace movil para reformas y rehabilitacion de viviendas.

Core loop:

1. Cliente se registra y crea un lead.
2. Profesionales activos ven leads relevantes.
3. Profesional envia quote.
4. Cliente acepta quote mediante `accept_quote`.
5. Se crea proyecto.
6. Cliente paga via Stripe Connect y Edge Functions.
7. Cliente y profesional chatean por conversacion.
8. Se completa el proyecto.
9. Cliente deja review verificada.

Modelo de negocio: 10% de comision sobre pagos completados.

## Stack Cerrado

| Capa | Tecnologia |
| --- | --- |
| App movil | React Native + Expo SDK 54 |
| Router | Expo Router |
| Lenguaje | TypeScript estricto |
| Estilos | NativeWind v4 |
| Backend | Supabase Auth, PostgreSQL, RLS, Storage, Realtime |
| Estado | Zustand |
| Formularios | React Hook Form + Zod |
| Pagos | Stripe Connect via Supabase Edge Functions |
| Push | Expo Notifications + Supabase |
| Admin | Vite + React + Supabase |

No usar React Navigation como router principal. No usar Firebase Auth. No usar OneSignal como decision nueva. No llamar Stripe desde la app.

## Reglas De Arquitectura

- Toda llamada a Supabase desde la app vive en `habitup/src/services/`.
- Pantallas y hooks no importan `supabase` directamente.
- Storage se accede mediante `storage.service.ts`.
- Los pagos pasan por Edge Functions.
- Observabilidad de app usa RPCs seguras (`record_app_error`, `record_app_event`).
- Analytics admin se leen mediante RPCs admin, no vistas directas.
- RLS esta activo: si una query falla, revisar policies antes de filtrar de forma redundante.
- Usar NativeWind con `className`; evitar estilos inline y `StyleSheet.create` en UI nueva.
- Usar async/await y manejar siempre `{ data, error }`.

## Estado De Datos

Migraciones reales: `habitup/supabase/migrations/20250101000000_*.sql` a `20250101000020_*.sql`.

Tablas clave:

- `users`: mirror de `auth.users`.
- `professional_profiles`: datos completos del profesional; SELECT reservado a propietario/admin.
- `professionals_with_categories`: vista publica segura para busqueda/perfil publico.
- `leads`, `quotes`, `projects`: loop comercial.
- `conversations`: agregado de chat antes o despues de proyecto.
- `messages`: mensajes por `conversation_id`; `project_id` queda opcional por compatibilidad.
- `payments`, `commissions`: pagos y comisiones.
- `reviews`: reviews verificadas, una por proyecto.
- `verification_documents`: metadatos de documentos KYC.
- `notifications`: notificaciones in-app con `related_type`.

Reglas importantes:

- No escribir columnas generated de `projects`: `platform_commission_amount`, `professional_receives`.
- `avg_rating` y `total_reviews` se actualizan por trigger.
- Solo una review por proyecto y solo con proyecto completado.
- Las comisiones se registran por trigger cuando el pago queda completado.

## Storage

Buckets reales:

- `avatars` publico.
- `lead-images` publico.
- `portfolio-images` publico.
- `verification-documents` privado.

Convencion:

- Documentos de verificacion siempre bajo `{auth.uid()}/...`.
- Portfolio bajo `{portfolio_item_id}/...`.
- Leads bajo `{lead_id}/...`.

## Chat

La fuente de verdad es `conversations`.

- Chat pre-acuerdo: `lead_id` + `professional_id`.
- Chat de proyecto: `project_id`.
- `messagesService` trabaja por conversacion y mantiene wrappers de compatibilidad por proyecto.
- Realtime se suscribe a `messages.conversation_id`.

## Admin

El panel `admin/` usa Supabase con usuario admin. Las metricas se leen por:

- `admin_kpi_overview`
- `admin_conversion_funnel`
- `admin_daily_trend`

No consultar directamente `analytics.*` desde cliente.

## Verificacion

App:

```bash
cd habitup
npm run typecheck
npm run lint
npm run supabase:test:rls
```

Admin:

```bash
cd admin
npm run typecheck
```

`admin/` no tiene script `lint` en este momento.

## Archivos Historicos

`HABITUP_CLAUDE_CODE_PROMPT.md` queda como archivo historico. No usarlo como plan activo sin contrastarlo con `CLAUDE.md`, `README.md` y las migraciones actuales.
