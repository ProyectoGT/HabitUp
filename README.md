# HabitUp

HabitUp es una app movil marketplace para conectar clientes que necesitan reformas, reparaciones o servicios del hogar con profesionales verificados.

El MVP prioriza el core loop:

Cliente crea solicitud -> profesional envia presupuesto -> cliente acepta -> se crea proyecto -> chat -> finalizacion confirmada -> resena verificada.

## Stack

- React Native + Expo
- TypeScript estricto
- Expo Router
- Supabase Auth, PostgreSQL, RLS, Realtime y Storage
- Zustand
- React Hook Form + Zod
- NativeWind
- Stripe Connect preparado para fases posteriores

## Estructura

```txt
habitup/
  app/                    Rutas Expo Router
    (auth)/               Login, registro y onboarding inicial
    (client)/             Home, leads, proyectos, perfil, busqueda
    (professional)/       Home, leads disponibles, proyectos, perfil profesional
    chat/[projectId].tsx  Chat por proyecto
  src/
    components/           UI reutilizable, cards, chat, leads, profesionales
    config/               Variables de entorno
    hooks/                Auth, notificaciones, mensajes, profesionales
    services/             Supabase y logica de negocio por dominio
    stores/               Zustand
    types/                Modelos principales
    utils/                Constantes y formateadores
  supabase/
    migrations/           Migraciones SQL
    functions/            Edge Functions futuras/pagos/notificaciones
```

## Requisitos

- Node 20+
- npm
- Expo CLI via `npx` o scripts npm
- Proyecto Supabase remoto o Supabase local

En Windows/PowerShell puede que `npm` y `npx` fallen por politica de ejecucion de scripts. Usa `npm.cmd` o `npx.cmd`.

## Variables de entorno

Copia `habitup/.env.example` a `habitup/.env.local`.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_optional_for_future_payments
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

Stripe es opcional para el MVP sin pagos.

## Scripts

Desde la raiz:

```bash
npm run dev
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm run test
```

Desde `habitup/` tambien puedes usar los mismos scripts.

## Supabase

1. Crea un proyecto en Supabase.
2. Aplica el schema principal si la base esta vacia: `supabase/habitup_schema.sql`.
3. Aplica las migraciones de la app en orden:
   - `habitup/supabase/migrations/001_add_push_notifications.sql`
   - `habitup/supabase/migrations/002_mvp_core_loop.sql`
4. Activa Realtime para `messages` y `notifications` si quieres chat/notificaciones en vivo.
5. Crea buckets de Storage futuros:
   - `lead-photos`
   - `portfolio`
   - `verification-documents`

Seed demo:

- `habitup/supabase/seed_demo.sql`
- Requiere crear antes los usuarios en Supabase Auth con los UUID indicados en el propio archivo.

## Estado actual

Implementado:

- Auth con Supabase.
- Roles cliente/profesional.
- Onboarding profesional.
- Creacion y listado de leads.
- Feed profesional de leads.
- Envio de presupuestos.
- Aceptacion de presupuesto con RPC `accept_quote`.
- Creacion de proyecto.
- Chat basico por proyecto con Supabase Realtime.
- Resenas verificadas para proyectos completados.
- Perfil profesional basico.
- Notificaciones in-app.
- Helper `trackEvent` preparado para PostHog/Segment.

Pendiente para cerrar MVP comercial:

- Onboarding cliente dedicado.
- Fotos de leads y portfolio con Supabase Storage.
- Automatizacion de creacion de usuarios Auth demo desde CLI/Admin API.
- ESLint/Prettier/Jest instalados y ejecutables.
- Pulido visual final y test manual en dispositivo.

## Documentacion

- `PRODUCT_SPEC.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `SECURITY_RLS.md`
- `DEMO_SCRIPT.md`
- `ROADMAP.md`

## Verificacion rapida

```bash
cd habitup
npm.cmd run typecheck
npx.cmd expo config --type public
```

El core loop debe probarse con un cliente y un profesional reales creados en Supabase Auth.
