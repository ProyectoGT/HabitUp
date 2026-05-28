# HabitUp — Contexto del Proyecto para Claude Code

## ¿Qué es HabitUp?
HabitUp es un marketplace móvil (iOS + Android) que conecta a **profesionales del sector de reformas y rehabilitación de viviendas** con **clientes particulares** que necesitan contratar esos servicios.

Funciona de forma similar a Habitissimo o Cronoshare pero con un modelo propio:
- Los profesionales crean un perfil detallado con su experiencia, portfolio de trabajos, especialidades, redes sociales y página web.
- Los clientes buscan a profesionales o empresas para pedir presupuesto (leads) describiendo el trabajo que necesitan.
- Los profesionales responden con presupuestos (quotes).
- El cliente acepta un presupuesto → se crea un proyecto → el cliente paga a través de la plataforma.
- **La plataforma cobra una comisión del 10% sobre cada pago completado.**
- Tras completar el proyecto, el cliente puede dejar una reseña verificada.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| App móvil | React Native + Expo (SDK 51+) |
| Lenguaje | TypeScript estricto (sin `any`) |
| Backend / BD | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Estado global | Zustand |
| Navegación | Expo Router v3 (file-based) |
| Formularios | React Hook Form + Zod |
| Estilos | NativeWind (Tailwind para RN) |
| Pagos | Stripe Connect (via Supabase Edge Functions) |
| Push notifications | Expo Notifications + OneSignal |
| Imágenes | Expo Image + Supabase Storage |
| Tests | Jest + React Native Testing Library |
| CI/CD | EAS Build (Expo Application Services) |

---

## Estructura de Carpetas

```
habitup/
├── app/                        # Rutas y pantallas (Expo Router file-based)
│   ├── (auth)/                 # login, register, forgot-password
│   ├── (client)/               # home, search, leads/, projects/, profile
│   ├── (professional)/         # home, leads/, projects/, portfolio/, profile
│   ├── chat/[projectId].tsx
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── ui/                 # Button, Input, Card, Badge, Avatar, RatingStars, etc.
│   │   ├── professionals/
│   │   ├── leads/
│   │   └── chat/
│   ├── hooks/                  # useAuth, useLeads, useQuotes, useProjects, etc.
│   ├── stores/                 # authStore, notificationStore
│   ├── services/               # TODA llamada a Supabase va aquí
│   ├── types/                  # database.types.ts (auto-generado), models.ts
│   ├── utils/                  # colors.ts, validators.ts, formatters.ts, constants.ts
│   └── config/                 # env.ts
├── supabase/
│   ├── migrations/             # 20 migraciones SQL versionadas
│   └── functions/              # Edge Functions Deno
│       ├── create-payment-intent/
│       ├── stripe-webhook/
│       ├── create-connect-account/
│       └── send-push-notification/
├── assets/
├── .env.local                  # NO commitear
└── app.json
```

---

## Base de Datos (Supabase / PostgreSQL)

| Tabla | Descripción |
|-------|-------------|
| `users` | Mirror de auth.users. user_type: 'cliente', 'professional', 'admin' |
| `professional_profiles` | Perfil detallado del profesional (1:1 con users) |
| `categories` | Especialidades: Fontanería, Electricidad, Carpintería... |
| `professional_categories` | Qué categorías tiene cada profesional (N:M) |
| `portfolio_items` | Fotos y descripción de trabajos anteriores |
| `leads` | Solicitudes de presupuesto publicadas por clientes |
| `quotes` | Presupuestos enviados por profesionales |
| `projects` | Contrato creado al aceptar un quote |
| `payments` | Transacciones Stripe. Incluye stripe_payment_intent_id |
| `commissions` | Comisiones del 10% registradas automáticamente |
| `reviews` | Reseñas verificadas (solo tras proyecto completado) |
| `messages` | Chat entre cliente y profesional |
| `conversations` | Agrupación de mensajes (lead o proyecto) |
| `verification_documents` | Documentos NIF/CIF del profesional |
| `favorites` | Profesionales guardados por un cliente |
| `notifications` | Notificaciones in-app |

**Reglas clave:**
- `users.id` = `auth.users.id` (creado por trigger `on_auth_user_created`)
- `platform_commission_amount` y `professional_receives` en `projects` se calculan automáticamente
- `avg_rating` y `total_reviews` en `professional_profiles` se actualizan via trigger al insertar review
- Solo se puede crear una review por proyecto, y el proyecto debe estar `completado`
- **RLS activo en TODAS las tablas** — no añadir filtros `.eq('user_id', uid)` manualmente

---

## Flujo Principal

```
CLIENTE crea LEAD
  → PROFESIONALES ven el lead → envían QUOTE
  → CLIENTE acepta QUOTE (RPC accept_quote())
  → Se crea PROJECT automáticamente
  → CLIENTE paga (Stripe via Edge Function create-payment-intent)
  → Webhook Stripe actualiza PAYMENT → trigger actualiza PROJECT.payment_status
  → PROFESIONAL marca trabajo finalizado (status: pendiente_finalizacion)
  → CLIENTE confirma (status: completado)
  → CLIENTE deja REVIEW → trigger actualiza avg_rating
```

---

## Convenciones de Código

1. **TypeScript estricto** — sin `any`. Usa siempre tipos de `database.types.ts` y `models.ts`.
2. **Toda llamada a Supabase va en `src/services/`** — componentes y hooks nunca importan `supabase` directamente.
3. **Si creas un componente**, ponlo en la carpeta correcta y expórtalo desde el `index.ts` de esa carpeta.
4. **RLS está activo** — no añadas filtros de usuario manualmente a menos que sea imprescindible.
5. **Para chat y notificaciones**, usa Supabase Realtime (`.channel().on()`).
6. **Los pagos siempre pasan por Edge Functions** — nunca llames a Stripe directamente desde la app.
7. **Estilos con NativeWind** (clases `className`) o StyleSheet — nunca estilos inline en JSX.
8. **No hardcodees strings mágicos** — usa constantes de `src/utils/constants.ts`.
9. **Maneja siempre el error** de Supabase — nunca lo ignores.
10. **No commitees `.env.local`** — está en `.gitignore`.

---

## Variables de Entorno

```bash
# habitup/.env.local
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
EXPO_PUBLIC_ONESIGNAL_APP_ID=xxxxx
```

---

## RPCs y Edge Functions

- `accept_quote(quote_id)` — RPC transaccional para aceptar un presupuesto y crear proyecto
- `increment_lead_views(lead_id)` — incrementa views_count sin race condition
- `create-payment-intent` — Edge Function que crea PaymentIntent de Stripe Connect
- `stripe-webhook` — Edge Function que procesa eventos de Stripe
- `create-connect-account` — Edge Function para onboarding de profesionales en Stripe
- `send-push-notification` — Edge Function para enviar push via OneSignal

---

## Modelo de Negocio

- **Comisión:** 10% sobre cada pago completado
- **Stripe Connect:** el cliente paga el total, Stripe divide (90% profesional, 10% plataforma)
- **Futuro:** leads destacados, suscripción Pro, perfil verificado Premium
