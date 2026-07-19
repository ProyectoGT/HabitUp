# HabitUp — Prompt de continuación

Copia todo lo que sigue como primer mensaje.

---

Trabajas en **HabitUp**, un marketplace móvil de reformas del hogar. Repo en `C:\repositorios\HabitUp`. Retomas un trabajo a medias.

## 0. Lo primero, antes de escribir una sola línea

Lee estos tres archivos del repo, en este orden. No empieces a trabajar sin haberlos leído:

1. **`HABITUP_VISION.md`** — el análisis largo de producto: comparativa entre el modelo de directorio y el de subasta de leads, el sistema visual completo con su justificación, el modelo de datos revisado, los riesgos de negocio y las decisiones que quedaron abiertas. Es el documento con más contexto del proyecto.
2. **`CLAUDE.md`** — reglas de arquitectura del repo. Ojo: su descripción del producto está desactualizada, refleja el modelo de leads antiguo.
3. **`habitup/supabase/migrations/`** — de la 027 en adelante, para entender qué se añadió hace poco.

Este documento que estás leyendo es el resumen ejecutivo. `HABITUP_VISION.md` es el desarrollo. Si hay contradicción entre ambos, manda este.

Y antes de escribir cualquier SQL, lee la sección 5. Ahí está el motivo por el que el trabajo anterior se atascó seis veces seguidas.

## 1. Producto

Dos tipos de usuario: **particulares** que necesitan una reforma o una urgencia, y **profesionales** que se promocionan en la app.

El flujo es de **directorio con contacto directo**, NO de subasta de leads:

```
El cliente busca y filtra profesionales (especialidad, ciudad/distancia)
  → contacta con uno concreto por chat
  → conversan; el cliente manda fotos, el pro pregunta
  → el pro emite un presupuesto dentro de la conversación
  → el cliente lo acepta → SE DESBLOQUEA la dirección exacta y el teléfono
  → trabajo en curso, siguen hablando por la app
  → el pro propone finalización, el cliente confirma
  → el cliente paga en la app, la plataforma retiene comisión
  → reseña verificada
```

**Importante:** la documentación antigua del repo (`HABITUP_CONTEXT_PROMPT.md`, `ARQUITECTURA_DATOS.md`) describe un modelo distinto, de leads públicos con varios profesionales compitiendo, tipo Habitissimo. **Está obsoleta.** Manda lo de arriba. Las tablas `leads`/`quotes` se reutilizan, pero la conversación es el eje.

## 2. Decisiones ya cerradas con el cliente

No las revierta sin preguntar.

**Comisión por tramos**, no plana: 10% hasta 500€, 7% de 500-2.000€, 4,5% de 2.000-8.000€, 3% por encima con tope de 900€. Vive en la tabla `commission_tiers`. El porcentaje aplicado se **congela** en `projects.platform_commission_pct` al aceptar el presupuesto: cambiar tarifas nunca puede recalcular proyectos pasados.

**Suscripción del profesional** (plan Pro, 29€/mes) que resta 2 puntos de comisión y da derecho a un slot promocionado.

**Los promocionados NO reordenan el listado.** Salen en su propio bloque, etiquetados como `PROMOCIONADO`, máximo 3, y nunca al principio absoluto (van tras los 3 primeros orgánicos). El orden orgánico lo manda exclusivamente el mérito calculado en base de datos.

**Ranking por mérito**, no por nota cruda. Media bayesiana (un perfil con 1 reseña de 5★ no puede adelantar a uno con 47 y un 4,8), más volumen de trabajos pagados en la app, tasa de respuesta y verificaciones. Pesos configurables en la tabla `ranking_settings`.

**Sello de visado de 3 niveles** (top 10%, top 25%, verificado). El percentil se calcula **dentro del conjunto filtrado** de la búsqueda, no globalmente: ser top 10% de España no sirve si buscas fontanero en Girona.

**Autoconfirmación a las 48h**: el pro propone finalización, aviso al cliente a las 24h, y si no responde en 48h se da por entregado. Una disputa congela el reloj. Queda registrado en `projects.auto_confirmed`.

**Privacidad de la dirección**: el profesional solo ve la dirección exacta a partir de la fase `aceptada`. La regla vive en una policy RLS sobre `conversation_property_details`, no en el cliente.

## 2b. Stack cerrado y reglas de arquitectura

No cambies estas decisiones.

| Capa | Tecnología |
| --- | --- |
| App | React Native + Expo SDK 54 |
| Router | Expo Router (file-based). **No** React Navigation como router principal |
| Lenguaje | TypeScript estricto, sin `any` |
| Estilos | NativeWind v4 (`className`). Evita `StyleSheet.create` en UI nueva |
| Backend | Supabase: Auth, PostgreSQL, RLS, Storage, Realtime |
| Estado | Zustand |
| Formularios | React Hook Form + Zod |
| Pagos | Stripe Connect vía Supabase Edge Functions. **Nunca** llamar a Stripe desde la app |
| Push | Expo Notifications + Supabase |
| Admin | Vite + React + Supabase, en `admin/` |

**Reglas duras:**

- Toda llamada a Supabase vive en `habitup/src/services/`. Las pantallas y los hooks **nunca** importan `supabase` directamente.
- Storage siempre a través de `storage.service.ts`.
- RLS está activo en todas las tablas. Si una query falla, revisa las policies antes de añadir filtros redundantes.
- Siempre `async/await`, y maneja siempre el `{ data, error }`.
- Analytics del admin se leen por RPCs (`admin_kpi_overview`, `admin_conversion_funnel`, `admin_daily_trend`), nunca consultando `analytics.*` desde cliente.

`CLAUDE.md` en la raíz es la fuente canónica del proyecto y contiene esto ampliado. Léelo. Pero ojo: su descripción del producto todavía refleja el modelo de leads antiguo — para el producto manda la sección 1 de este documento.

## 2c. Lo que ya existe en el repo

El proyecto **no** está en pañales: hay 34 pantallas, 16 servicios, 36 migraciones, Edge Functions de Stripe Connect (`create-connect-account`, `create-payment-intent`, `stripe-webhook`, `send-push-notification`), panel de admin, RLS, observabilidad y tests. Lo flojo es la capa visual.

Pantallas por zonas: `app/(auth)/`, `app/(client)/`, `app/(professional)/`, `app/chat/[projectId].tsx`.

Proyecto Supabase enlazado: ref `jcdllwourpwltaqdobxs`.

## 2d. Riesgos de negocio que el cliente ya conoce

**Fuga fuera de plataforma** es el riesgo número uno: cliente y profesional se conocen por el chat, intercambian teléfonos y pagan en efectivo. No se resuelve prohibiendo, sino haciendo que pagar dentro convenga a ambos: garantía y mediación para el cliente, cobro asegurado e historial verificable para el profesional. Por eso el score de mérito cuenta **trabajos pagados en la app**.

**Arranque en frío**: en modelo directorio, sin profesionales no hay producto. La recomendación fue concentrarse en una ciudad y tres especialidades antes de abrir a más.

**Encaje legal**: la plataforma es intermediaria, no contratista. La dirección del inmueble es dato personal (RGPD), de ahí el desbloqueo por fases.


## 3. Sistema visual: "Plano y Obra"

Metáfora **estructural**, no decorativa: la app se siente como un plano técnico que se va construyendo. Nada de iconos de ladrillo esparcidos.

Tokens en `habitup/global.css` (variables CSS) y espejo tipado en `habitup/src/utils/colors.ts`.

- Fondo yeso cálido `#F4F1EC`, tinta grafito `#1C1B19`
- Acento naranja de seguridad `#E8590C`, **solo para acción primaria**
- Azul de plano `#2C5F7C` para informativo, nunca acción
- Radio 6px (los materiales no son redondos), grid base 4px
- Labels de sección en mayúsculas con tracking amplio
- Iconografía de línea técnica, trazo 1.5px uniforme, una por especialidad (`src/utils/categoryIcons.ts`)

**Regla dura: ningún componente hardcodea un hex.** Si falta un color, se añade a `global.css` primero.

El elemento característico pendiente de construir es el **andamio de 5 niveles** que representa las fases del trabajo (contacto → presupuestada → aceptada → en obra → entregada). Debe aparecer en el chat, en el listado de proyectos y en el detalle.

## 4. Estado actual

**Hecho:**

- Sistema de tokens unificado. Antes convivían tres azules distintos y nadie usaba los tokens.
- `ApprovalSeal`, `BlueprintGrid`, `categoryIcons`, hook `useThemeColors`.
- Pantalla de búsqueda y `ProfessionalCard` rediseñadas.
- `professionals.service.ts` migrado a la RPC `search_professionals`.
- Migraciones 027 a 036 aplicadas en la base remota: tramos de comisión, suscripciones, ranking por mérito, fases de conversación, autoconfirmación 48h, y datos de prueba.
- **Datos de prueba cargados**: 150 profesionales, 80 clientes, con distribución desigual a propósito (20% sin reseñas, Madrid 30 veces más denso que Lugo). Password `HabitUpDev123!`, usuarios `cliente001@dev.habitup.app` y `pro001@dev.habitup.app`.

**Pendiente inmediato:**

1. **Pulir el diseño de la búsqueda.** El cliente lo describe como caótico y poco homogéneo. Acaba de arreglarse un bug que hacía el texto casi invisible (ver §5), así que hay que volver a valorarlo con ojos limpios. Ya se quitó el filtro por valoración a petición suya.
2. Chat con el componente del andamio de fases.
3. Emisión y aceptación de presupuestos dentro de la conversación.
4. Pagos con Stripe Connect en modo test.

## 4b. Archivos creados o modificados en esta tanda

Creados:
- `habitup/src/hooks/useThemeColors.ts`
- `habitup/src/utils/categoryIcons.ts`
- `habitup/src/components/ui/ApprovalSeal.tsx`
- `habitup/src/components/ui/BlueprintGrid.tsx`
- `habitup/supabase/migrations/20250101000027_commission_tiers_and_subscriptions.sql`
- `habitup/supabase/migrations/20250101000028_merit_ranking_and_seals.sql`
- `habitup/supabase/migrations/20250101000029_conversation_phases_and_private_address.sql`
- `habitup/supabase/migrations/20250101000030_auto_confirm_completion_48h.sql`
- `habitup/supabase/migrations/20250101000032_fix_accept_quote_generated_columns.sql`
- `habitup/supabase/migrations/20250101000033` y `20250101000035` (arreglos de `commissions.percentage`)
- `habitup/supabase/migrations/20250101000036_dev_seed_data.sql`
- `.gitattributes` (normalización de fines de línea)
- `HABITUP_VISION.md` en la raíz: documento largo con el análisis de producto, comparativa de modelos de negocio y decisiones pendientes. **Léelo, tiene contexto que no cabe aquí.**

Modificados:
- `habitup/global.css`, `habitup/tailwind.config.js`, `habitup/src/utils/colors.ts`
- `habitup/app/(client)/search.tsx`
- `habitup/src/components/professionals/ProfessionalCard.tsx`
- `habitup/src/services/professionals.service.ts`
- `habitup/src/components/ui/index.ts`

Rama de trabajo: `recovery/stabilization`.


## 5. Trampas que ya han costado horas. LÉELAS.

**El esquema real de la base NO coincide con los archivos de migración.** Varias tablas se crearon antes con un esquema antiguo y las migraciones con `CREATE TABLE IF NOT EXISTS` pasaron por encima sin tocarlas. **Nunca escribas SQL fiándote de los archivos de migración.** Consulta siempre el esquema real:

```sql
SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS cols
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('...')
GROUP BY table_name;
```

Ignorar esto provocó seis intentos fallidos seguidos.

**Columnas GENERATED.** `projects.platform_commission_amount` y `projects.professional_receives` son generadas. Escribirlas da `SQLSTATE 428C9`. Los archivos de migración las declaran como NUMERIC normales — mienten.

**pgcrypto vive en el esquema `extensions`, no en `public`.** `crypt()` y `gen_salt()` no se resuelven durante una migración sin cualificar el esquema.

**`commissions.percentage` es NOT NULL y el trigger original no la rellena.** Hay un trigger de reparación (migración 035) que lo cubre leyendo los campos vía `to_jsonb(NEW)`, técnica útil cuando no sabes qué columnas tiene una tabla.

**No hay Docker en esta máquina.** `supabase db diff`, `db reset` y `supabase start` no funcionan. Solo `supabase db push` contra la base remota. Y **no hay `psql`**: para lanzar SQL suelto, usa el SQL Editor del panel de Supabase o mete el SQL en una migración.

**PowerShell corrompe archivos con `>`.** Escribe en UTF-16. Para generar tipos:
```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/types/database.types.ts
```

**PowerShell trunca las líneas largas de error.** Para ver un error de `db push` entero:
```powershell
$Host.UI.RawUI.BufferSize = New-Object Management.Automation.Host.Size(500,3000)
npx supabase db push 2>&1 | Out-File push.log -Encoding utf8
Select-String -Path push.log -Pattern "ERROR" | ForEach-Object { $_.Line }
```

**El tema oscuro.** `useColorScheme` de NativeWind devuelve `undefined` en web. Si te fías solo de él, el CSS pinta el fondo oscuro mientras los tokens imperativos devuelven los del tema claro, y el texto queda ilegible. `useThemeColors` ya cae al `useColorScheme` de React Native, pero tenlo presente.

**Expo Web a 1900px.** Es una app de móvil. Sin tope de ancho todo se estira y parece roto. La búsqueda ya tiene `MAX_CONTENT_WIDTH = 520` centrado; aplica lo mismo a las pantallas nuevas.

## 6. Cómo verificar

```bash
cd habitup
npx tsc --noEmit          # debe salir limpio
npx expo start -c         # -c obligatorio si tocas global.css
```

`npx jest` termina con código 0 pero sin salida — la config de tests parece rota, no está verificado.

## 7. Higiene pendiente

- **Borra `habitup/supabase/migrations/20250101000036_dev_seed_data.sql` antes de crear un entorno de producción**, o acabarás con 230 usuarios ficticios en real.
- Los nombres de categorías son inconsistentes en la base: conviven "Cerrajería" y "Cristalería" con acento junto a "Albanileria", "Banos" y "Fontaneria" sin él. Se ve descuidado en cualquier diseño. Falta normalizarlos.
- `pg_cron` debe estar activo para que la autoconfirmación de 48h se ejecute.

## 7b. Decisiones que siguen abiertas

Pregúntale antes de asumir:

1. ¿Modelo directorio puro, o híbrido con rescate por lead si el cliente no recibe respuesta en X horas?
2. ¿Los tramos de comisión propuestos le valen? ¿El tope de 900€ es correcto?
3. ¿Reseñas bidireccionales (el pro también valora al cliente) o solo cliente → profesional?
4. Ciudad y especialidades de lanzamiento.


## 8. Cómo trabajar con este cliente

Es directo y valora que le digas las cosas claras. Le molesta la palabrería y las rondas de prueba y error. Prefiere una respuesta que funcione a la primera aunque tardes más en prepararla.

**Antes de escribir SQL, consulta el esquema real. Antes de dar algo por bueno, ejecútalo.**
