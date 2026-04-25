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
| Lenguaje | TypeScript |
| Backend / BD | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Estado global | Zustand |
| Navegación | React Navigation v6 (Stack + Bottom Tabs) |
| Formularios | React Hook Form + Zod |
| Estilos | NativeWind (Tailwind para RN) o StyleSheet nativo |
| Pagos | Stripe Connect (via Supabase Edge Functions) |
| Push notifications | Expo Notifications + OneSignal |
| Imágenes | Expo Image + Cloudinary o Supabase Storage |
| Tests | Jest + React Native Testing Library |
| CI/CD | EAS Build (Expo Application Services) |

---

## Estructura de Carpetas

```
habitup/
├── app/                        # Rutas y pantallas (Expo Router file-based)
│   ├── (auth)/                 # Pantallas de autenticación
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (client)/               # Pantallas para clientes
│   │   ├── home.tsx
│   │   ├── search.tsx
│   │   ├── leads/
│   │   │   ├── create.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── projects/
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   └── profile.tsx
│   ├── (professional)/         # Pantallas para profesionales
│   │   ├── home.tsx
│   │   ├── leads/
│   │   │   ├── available.tsx
│   │   │   └── [id].tsx
│   │   ├── projects/
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── portfolio/
│   │   │   ├── add.tsx
│   │   │   └── index.tsx
│   │   └── profile.tsx
│   ├── chat/
│   │   └── [projectId].tsx
│   └── _layout.tsx
├── src/
│   ├── components/             # Componentes reutilizables
│   │   ├── ui/                 # Botones, inputs, cards, etc.
│   │   ├── professionals/      # ProfessionalCard, RatingStars, etc.
│   │   ├── leads/              # LeadCard, LeadForm, etc.
│   │   └── chat/               # MessageBubble, ChatInput, etc.
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useProfessionals.ts
│   │   ├── useLeads.ts
│   │   └── useMessages.ts
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts
│   │   ├── leadStore.ts
│   │   └── notificationStore.ts
│   ├── services/               # Llamadas a Supabase
│   │   ├── supabase.ts         # Inicialización del cliente
│   │   ├── auth.service.ts
│   │   ├── professionals.service.ts
│   │   ├── leads.service.ts
│   │   ├── quotes.service.ts
│   │   ├── projects.service.ts
│   │   ├── payments.service.ts
│   │   └── reviews.service.ts
│   ├── types/                  # TypeScript types e interfaces
│   │   ├── database.types.ts   # Auto-generado por Supabase CLI
│   │   ├── models.ts
│   │   └── navigation.ts
│   ├── utils/                  # Helpers y funciones puras
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── config/
│       └── env.ts
├── supabase/
│   ├── schema.sql              # Esquema completo de la BD
│   ├── migrations/             # Migraciones históricas
│   └── functions/              # Edge Functions (Deno)
│       ├── stripe-webhook/
│       └── create-payment-intent/
├── assets/
│   ├── images/
│   └── fonts/
├── .env.local                  # Variables de entorno (no commitear)
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Base de Datos (Supabase / PostgreSQL)

Las tablas principales son:

| Tabla | Descripción |
|-------|-------------|
| `users` | Todos los usuarios. user_type: 'cliente', 'professional', 'admin' |
| `professional_profiles` | Perfil detallado de cada profesional (1:1 con users) |
| `categories` | Especialidades: Fontanería, Electricidad, Carpintería... (10 pre-cargadas) |
| `professional_categories` | Qué categorías tiene cada profesional (N:M) |
| `portfolio_items` | Fotos y descripción de trabajos anteriores del profesional |
| `leads` | Solicitudes de presupuesto publicadas por clientes |
| `quotes` | Presupuestos enviados por profesionales en respuesta a un lead |
| `projects` | Contrato cerrado entre cliente y profesional (creado al aceptar un quote) |
| `payments` | Transacciones de Stripe. Incluye stripe_payment_intent_id |
| `commissions` | Registro de comisiones de la plataforma (10% por proyecto) |
| `reviews` | Reseñas verificadas (solo tras proyecto completado, única por proyecto) |
| `messages` | Chat entre cliente y profesional dentro de un proyecto |
| `verification_documents` | Documentos para verificar el NIF/CIF del profesional |
| `favorites` | Profesionales guardados por un cliente |
| `notifications` | Notificaciones in-app para cada usuario |

**Reglas clave de negocio en la BD:**
- Las columnas `platform_commission_amount` y `professional_receives` en `projects` son GENERATED (calculadas automáticamente).
- El `avg_rating` en `professional_profiles` se actualiza automáticamente via trigger cuando se inserta una review.
- Solo se puede crear una review por proyecto, y el proyecto debe estar en status `completado`.
- Las comisiones se registran automáticamente via trigger cuando `payments.status` pasa a `completado`.

**Row Level Security (RLS) habilitado en todas las tablas.** Cada usuario solo accede a sus propios datos. No añadir filtros manuales de usuario en las queries — el RLS ya los aplica automáticamente.

---

## Flujo Principal de la App

```
1. REGISTRO / LOGIN
   └─ Email/password o Google OAuth
   └─ Selección de rol: Cliente o Profesional
   └─ Si Profesional: completar professional_profile

2. CLIENTE: Buscar profesional o crear lead
   └─ Buscar por categoría + ciudad + radio
   └─ Ver perfil del profesional (portfolio, reviews, categorías)
   └─ Crear un lead (solicitud de presupuesto)

3. PROFESIONAL: Ver y responder leads
   └─ Feed de leads activos en su categoría / zona
   └─ Enviar quote (presupuesto) a un lead
   └─ Gestionar quotes enviados

4. CLIENTE: Gestionar presupuestos recibidos
   └─ Ver quotes en su lead
   └─ Aceptar un quote → se crea proyecto
   └─ Pagar (Stripe) → el profesional recibe pago menos comisión

5. PROYECTO EN CURSO
   └─ Chat en tiempo real entre cliente y profesional
   └─ Seguimiento del estado del proyecto

6. CIERRE
   └─ Marcar proyecto como completado
   └─ Cliente deja reseña (rating 1-5, comentario, fotos)
   └─ Trigger actualiza avg_rating del profesional
```

---

## Modelo de Negocio

- **Comisión:** 10% sobre cada pago completado
- **Stripe Connect:** el cliente paga el total, Stripe divide automáticamente (90% profesional, 10% plataforma)
- **Monetización futura:** leads destacados (pago por profesional), suscripción mensual Pro, perfil verificado Premium

---

## Convenciones de Código

- **TypeScript estricto** — sin `any`, siempre tipar los responses de Supabase con `database.types.ts`
- **Componentes funcionales** con hooks, nunca clases
- **Async/await** siempre, nunca `.then()/.catch()` anidados
- **Zustand** para estado global (auth, notificaciones); estado local con `useState`/`useReducer`
- **React Hook Form + Zod** para todos los formularios con validación
- **Error handling explícito** — siempre manejar el `error` que devuelve Supabase
- **Separación de responsabilidades:** la lógica de negocio va en `services/`, nunca en los componentes directamente
- Los componentes solo saben de UI y llaman a hooks/servicios

---

## Variables de Entorno Necesarias

```bash
# .env.local
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## Estado Actual del Proyecto

- [x] Nombre definido: HabitUp
- [x] Stack decidido: React Native + Expo + Supabase
- [x] Esquema de BD diseñado (reforma360_schema.sql → renombrar a habitup)
- [ ] Proyecto Supabase creado y configurado
- [ ] Proyecto React Native / Expo inicializado
- [ ] Autenticación funcionando
- [ ] Pantallas principales construidas

---

## Instrucciones para Claude Code

Cuando trabajes en este proyecto:

1. **Siempre usa TypeScript estricto.** Usa los tipos generados por Supabase (`database.types.ts`) para todas las queries.
2. **No hardcodees IDs ni strings mágicos.** Usa constantes en `src/utils/constants.ts`.
3. **Toda llamada a Supabase va en `src/services/`.** Los componentes y hooks nunca importan `supabase` directamente.
4. **Si creas un nuevo componente,** ponlo en la carpeta correcta de `src/components/` y expórtalo desde el `index.ts` de esa carpeta.
5. **Recuerda que RLS está activo.** No añadas filtros `.eq('user_id', uid)` manualmente a menos que sea estrictamente necesario — el RLS ya filtra.
6. **Para el chat y notificaciones,** usa Supabase Realtime (`.channel().on()`).
7. **Los pagos siempre pasan por Supabase Edge Functions,** nunca se llama a Stripe directamente desde la app.
8. **Antes de crear un archivo nuevo,** verifica si ya existe algo similar en la estructura.
9. **Los estilos** van con NativeWind (clases Tailwind en `className`) o StyleSheet, nunca estilos inline en JSX.
10. **No commitees `.env.local`** — está en `.gitignore`.
