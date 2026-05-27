# HabitUp

Marketplace móvil para conectar clientes con profesionales de reformas y rehabilitación.

**Core loop:** Cliente crea solicitud → profesional envía presupuesto → cliente acepta → proyecto → chat → finalización → reseña verificada.

---

## Stack

| Capa         | Tecnología                                                    |
| ------------ | ------------------------------------------------------------- |
| Frontend     | React Native + Expo SDK 54 + Expo Router                     |
| Lenguaje     | TypeScript estricto                                           |
| Estilos      | NativeWind v4 + Tailwind CSS                                  |
| Backend      | Supabase (PostgreSQL, Auth, RLS, Realtime, Storage)           |
| Estado       | Zustand                                                       |
| Formularios  | React Hook Form + Zod                                         |
| Pagos        | Stripe Connect (Edge Functions)                               |
| Notificaciones | Expo Notifications + Supabase Realtime                      |

---

## Requisitos

- **Node 20+**
- **npm** (o npm.cmd en Windows)
- **Expo CLI**: se usa via `npx`, no instalación global
- **Supabase CLI** (opcional, solo para `supabase:types`): `npm install -g supabase`
- **EAS CLI** (opcional, solo para builds): `npm install -g eas-cli`

> En Windows/PowerShell, si `npm` falla por políticas de ejecución, usa `npm.cmd`.

---

## Primeros pasos

### 1. Clonar e instalar

```bash
git clone <repo-url> habitup
cd habitup
npm install
cd habitup
npm install
cd ..
```

### 2. Configurar entorno

Copia el ejemplo y rellena los valores:

```bash
cp habitup/.env.example habitup/.env.local
```

Edita `habitup/.env.local` con los datos de tu proyecto Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EXPO_PUBLIC_SUPABASE_PROJECT_ID=tu-ref
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_PROJECT_ID=tu-expo-project-id
```

Stripe y Expo Notifications son opcionales en MVP.

### 3. Arrancar Expo

```bash
# Web (rapido para desarrollo)
npm run web

# iOS (requiere Xcode)
npm run ios

# Android (requiere Android Studio)
npm run android
```

### 4. Verificar

```bash
cd habitup
npm run typecheck    # TypeScript sin errores
npm run lint         # ESLint
npm run format:check # Prettier
```

---

## Supabase

### Opción A: Proyecto remoto (recomendado para empezar)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia las credenciales a `.env.local`.
3. Aplica migraciones en orden desde el SQL Editor:
   - `habitup/supabase/migrations/000_schema_base.sql`
   - `habitup/supabase/migrations/001_add_push_notifications.sql`
   - `habitup/supabase/migrations/002_mvp_core_loop.sql`
4. Activa **Realtime** para tablas `messages` y `notifications` (Dashboard > Database > Replication).
5. Crea buckets de Storage:
   - `lead-photos` (público)
   - `portfolio` (público)
   - `verification-documents` (privado)

### Opción B: Local (requiere Supabase CLI + Docker)

```bash
supabase start
supabase migration up
supabase db push
npm run supabase:types:local
```

### Seed demo

Ejecuta `habitup/supabase/seed_demo.sql` en tu proyecto. Requiere crear los usuarios en Auth con los UUID indicados en el propio fichero.

---

## Scripts disponibles

Ejecutar desde `habitup/` o desde la raíz (los scripts raíz delegan en la subcarpeta):

| Script             | Descripción                                      |
| ------------------ | ------------------------------------------------ |
| `npm run start`    | Inicia Expo en modo desarrollo                   |
| `npm run dev`      | Alias de `start`                                 |
| `npm run web`      | Expo para web                                    |
| `npm run ios`      | Expo para iOS (requiere Xcode)                   |
| `npm run android`  | Expo para Android (requiere Android Studio)      |
| `npm run typecheck`| TypeScript --noEmit (strict)                     |
| `npm run lint`     | ESLint con configuración Expo                    |
| `npm run format`   | Prettier --write (aplica formato)                |
| `npm run format:check` | Prettier --check (solo verifica)             |
| `npm run test`     | Tests (pendiente de configurar Jest/RNTL)       |
| `npm run supabase:types` | Genera `database.types.ts` desde Supabase remoto |

---

## Estructura del proyecto

```
habitup/
├── app/                    # Expo Router (ficheros = rutas)
│   ├── (auth)/             # Login, registro, onboarding
│   ├── (client)/           # Home, leads, proyectos, perfil, búsqueda
│   ├── (professional)/     # Home, leads, proyectos, perfil, onboarding profesional
│   ├── chat/               # Chat por proyecto
│   ├── _layout.tsx          # Layout raíz (Stripe, auth guard)
│   ├── index.tsx            # Splash + redirección
│   └── notifications.tsx
├── src/
│   ├── components/         # UI, leads, profesionales, chat
│   ├── config/             # Variables de entorno (env.ts)
│   ├── hooks/              # useAuth, useMessages, useNotifications, useProfessionals
│   ├── services/           # Supabase por dominio (leads, quotes, projects...)
│   ├── stores/             # Zustand (authStore, notificationStore)
│   ├── types/              # Modelos TypeScript
│   └── utils/              # Constantes, formateadores
├── supabase/
│   ├── migrations/         # Migraciones SQL (000, 001, 002)
│   ├── functions/          # Edge Functions (Stripe, push)
│   └── seed_demo.sql       # Datos de demostración
├── .env.example
├── app.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── metro.config.js
```

---

## Documentación adicional

| Fichero                     | Contenido                                   |
| --------------------------- | ------------------------------------------- |
| `PRODUCT_SPEC.md`           | Especificación del producto                 |
| `ARCHITECTURE.md`           | Decisiones técnicas                         |
| `DATABASE.md`               | Modelo de datos detallado                   |
| `SECURITY_RLS.md`           | Políticas de Row Level Security             |
| `DEMO_SCRIPT.md`            | Script de demo guiado                      |
| `QA_CHECKLIST.md`           | Lista de verificación para QA              |
| `ROADMAP.md`                | Próximos pasos                              |
| `HABITUP_CONTEXT_PROMPT.md` | Contexto para asistentes IA                 |

---

## Estado del proyecto

**Implementado:** Auth, roles, leads, presupuestos, aceptación transaccional, proyectos, chat, reseñas, notificaciones in-app, perfil profesional.

**Pendiente (MVP):** Onboarding cliente, fotos/Storage, tests automatizados, pulido visual.
