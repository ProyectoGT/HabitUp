# HabitUp

Marketplace movil para conectar clientes con profesionales de reformas y rehabilitacion.

**Core loop beta:** registro -> lead -> quote -> aceptacion -> proyecto -> pago Stripe Connect -> chat -> cierre -> review verificada.

## Estado Canonico

Este README refleja el estado real del repo a 2026-06-01.

- App: React Native + Expo SDK 54 + Expo Router.
- Estilos: NativeWind v4 con `className`.
- Backend: Supabase Auth, PostgreSQL, RLS, Storage, Realtime y Edge Functions.
- Chat: `conversations` es el agregado principal; `messages.project_id` queda como compatibilidad opcional.
- Profesionales: la app publica lee `professionals_with_categories`; `professional_profiles` queda reservado para propietario/admin.
- Storage: todas las subidas pasan por `src/services/storage.service.ts`.
- Observabilidad: la app escribe eventos/errores mediante RPC segura, no inserts directos.
- Admin analytics: el panel lee metricas mediante RPCs admin (`admin_kpi_overview`, `admin_conversion_funnel`, `admin_daily_trend`).

## Requisitos

- Node 20+
- npm
- Docker, si se usa Supabase local
- Supabase CLI, si se aplican migraciones o se regeneran tipos
- EAS CLI, solo para builds moviles

En Windows/PowerShell, si `npm` falla por politica de ejecucion, usa `npm.cmd`.

## Instalacion

```bash
git clone <repo-url> habitup
cd habitup
npm install
cd habitup
npm install
cd ../admin
npm install
```

## Variables De Entorno

Configura `habitup/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EXPO_PUBLIC_SUPABASE_PROJECT_ID=tu-ref
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_PROJECT_ID=tu-expo-project-id
```

## Desarrollo App

Desde `habitup/`:

```bash
npm run web
npm run ios
npm run android
```

## Supabase

Las migraciones reales estan en `habitup/supabase/migrations/` y se aplican en orden `20250101000000` a `20250101000020`.

Para entorno local:

```bash
cd habitup
npm run supabase:start
npm run supabase:reset
npm run supabase:types:local
```

Buckets creados por migracion:

- `avatars` publico
- `lead-images` publico
- `portfolio-images` publico
- `verification-documents` privado

Convencion de rutas Storage:

- `avatars`: `{auth.uid()}/{uuid}.{ext}`
- `lead-images`: `{lead_id}/{uuid}.{ext}`
- `portfolio-images`: `{portfolio_item_id}/{uuid}.{ext}`
- `verification-documents`: `{auth.uid()}/{uuid}.{ext}`

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

El proyecto `admin/` no tiene script `lint` actualmente.

## Estructura

```text
habitup/
  app/                    Expo Router
  src/
    components/           UI y componentes de dominio
    config/               env.ts
    hooks/                hooks de orquestacion
    services/             unica capa que importa Supabase
    stores/               Zustand
    types/                database.types.ts y modelos de dominio
    utils/                constantes y helpers
  supabase/
    migrations/           SQL versionado
    functions/            Edge Functions
    tests/                suite RLS
admin/
  src/                    backoffice Vite
```

## Documentacion

- `CLAUDE.md`: contexto canonico para agentes.
- `habitup/README.md`: instrucciones especificas de app.
- `habitup/supabase/tests/README.md`: suite RLS.
- `HABITUP_CLAUDE_CODE_PROMPT.md`: archivo historico; no usar como fuente canonica.

## Prioridad De Producto

La beta fuerte prioriza estabilidad y seguridad del loop principal antes de nuevas features: RLS correcto, privacidad de perfiles, pagos por Edge Functions, chat por conversacion, Storage alineado y observabilidad operativa.
