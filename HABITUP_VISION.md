# HabitUp — Visión de producto, diseño y ejecución

Documento de trabajo. Julio 2026.

---

## 0. Conflicto detectado entre el repo y la visión actual

El repositorio (`HABITUP_CONTEXT_PROMPT.md`, `ARQUITECTURA_DATOS.md`, `reforma360_schema.sql`)
describe un **modelo de leads competitivos** al estilo Habitissimo:

> Cliente publica lead público → N profesionales envían quotes → cliente elige.

La visión actual es un **modelo de directorio con contacto directo**:

> Cliente busca y filtra profesionales → contacta a uno por chat → conversan →
> el profesional emite un presupuesto para ese cliente concreto.

Son productos distintos. Antes de escribir código hay que cerrar esta decisión.

### Comparativa

| | Modelo lead (repo actual) | Modelo directorio (visión nueva) |
|---|---|---|
| Iniciativa | Cliente describe trabajo, espera ofertas | Cliente elige a quién contactar |
| Competencia | Varios pros compiten por precio | El pro compite por perfil y reputación |
| Riesgo | Carrera a la baja, spam al cliente | Arranque lento: sin pros, no hay nada que buscar |
| Monetización natural | Venta de leads / suscripción por acceso | Suscripción por visibilidad + comisión |
| Densidad necesaria | Necesita muchos pros por categoría | Necesita menos, pero mejores |

### Recomendación

Modelo directorio como principal (es tu visión), con un mecanismo de rescate:
si el cliente no encuentra o no recibe respuesta en X horas, se le ofrece
"publicar la solicitud" y convertirla en un lead abierto. Así aprovechas el
trabajo ya hecho en el schema sin que el modelo de subasta domine el producto.

---

## 1. Sistema visual: "Plano y obra"

Metáfora **estructural**, no decorativa. La app se siente como un plano técnico
que se va construyendo. Nada de iconos de ladrillo esparcidos.

### 1.1 Paleta

| Token | Valor | Uso |
|---|---|---|
| `surface.base` | `#F4F1EC` | Fondo, tono yeso cálido |
| `surface.raised` | `#FFFFFF` | Tarjetas |
| `surface.sunken` | `#E5E0D8` | Fondos hundidos, inputs |
| `ink.strong` | `#1C1B19` | Texto principal, grafito |
| `ink.muted` | `#6B6862` | Texto secundario |
| `accent.primary` | `#E8590C` | Naranja seguridad. SOLO acción primaria |
| `accent.blueprint` | `#2C5F7C` | Azul plano técnico, informativo |
| `state.progress` | `#E8590C` | Fase en curso |
| `state.done` | `#2F7A4F` | Fase completada |
| `state.pending` | `#B8B3AA` | Fase no alcanzada |

Modo oscuro: base `#16151A`, tinta `#EDEAE4`, el naranja sube a `#FF7A33`.

### 1.2 Forma y espacio

- **Grid base 4px.** Todo espaciado es múltiplo de 4.
- **Proporción ladrillo 2:1** en tarjetas de profesional (formato compacto).
- **Aparejo desfasado**: en el listado, las tarjetas alternan un desfase
  horizontal de 8px como una hilada de ladrillo. Rompe la linealidad sin caos.
- **Radio 6px** en todo salvo avatares. Los materiales no son redondos.
- **Retícula de plano**: fondo con cuadrícula milimetrada al 3-4% de opacidad.
- **Líneas de cota** en vez de separadores genéricos: línea fina con topes
  verticales en los extremos, como en un plano acotado.

### 1.3 Tipografía

- Titulares: geométrica condensada, tipo rótulo de plano. Mayúsculas en labels
  de sección con tracking amplio (`letter-spacing: 0.08em`).
- Cuerpo: humanista legible, sin adornos.
- Cifras (precios, distancias, presupuestos): **tabulares**, siempre alineadas.

### 1.4 Iconografía

Un set propio de línea técnica, trazo uniforme 1.5px, estilo esquema de
instalación. Una por especialidad:

fontanería (grifo) · electricidad (enchufe) · albañilería (ladrillo) ·
carpintería (marco de puerta) · pintura (rodillo) · tejados (teja) ·
climatización (rejilla) · ventanas (cerco) · suelos (baldosa) · reforma integral (plano)

Esta iconografía **es** el lenguaje visual de la app. No hace falta más.

### 1.5 El andamio: el elemento característico

El flujo de contratación se representa siempre con el mismo componente vertical
de 5 niveles que se van "construyendo":

```
  ▓▓▓▓▓  5. Entregado y pagado
  ▓▓▓▓▓  4. En obra
  ▓▓▓▓▓  3. Presupuesto aceptado
  ▓▓▓▓▓  2. Presupuesto recibido
  ▓▓▓▓▓  1. Contacto iniciado
```

Aparece en el chat (cabecera compacta), en el listado de proyectos (mini) y en
el detalle (completo). Convierte la funcionalidad más importante del producto en
su rasgo visual más reconocible.

### 1.6 Momentos con personalidad

- **Empty state**: plano en blanco, "aún no hay nada construido aquí".
- **Loading**: barra que se rellena por hiladas de ladrillo, no un spinner.
- **Onboarding pro**: "levanta tu ficha", con progreso de obra por secciones.
- **Éxito de pago**: sello de "obra entregada" tipo cuño de proyecto visado.

---

## 2. Flujo funcional corregido

```
BÚSQUEDA          Cliente filtra por especialidad, distancia, banda de precio,
                  valoración, disponibilidad. Ve ubicación APROXIMADA (radio).
    ↓
CONTACTO          Abre conversación con un profesional concreto.
                  → Se crea CONVERSATION (no proyecto todavía)
                  → Teléfono y dirección OCULTOS
    ↓
NEGOCIACIÓN       Chat con texto, fotos, vídeo, audio, documentos.
                  El cliente describe; el pro pregunta.
    ↓
PRESUPUESTO       El pro emite QUOTE dentro de la conversación.
                  Versionable: puede re-presupuestar, se guarda el histórico.
    ↓
ACEPTACIÓN        Cliente acepta → se crea PROJECT
                  → SE DESBLOQUEA la dirección exacta y el teléfono
                  → Se congela el % de comisión aplicable
    ↓
EN OBRA           Chat sigue activo. Hitos opcionales. Fotos de avance.
    ↓
ENTREGA Y PAGO    Cliente confirma → paga en la app (Stripe Connect)
                  → Split automático: pro recibe neto, plataforma su comisión
    ↓
RESEÑA            Bidireccional, solo tras pago completado.
```

**Regla de oro:** ningún dato sensible (dirección exacta, teléfono) es visible
antes del estado `accepted`. Y esa regla vive en una **policy RLS de Postgres**,
nunca en un `if` del cliente.

---

## 3. Cambios necesarios en el modelo de datos

### 3.1 Nueva entidad: `conversations`

El schema actual ata `messages.project_id` → el chat no puede existir antes del
proyecto. Hay que invertirlo:

```sql
conversations
├── id, client_id, professional_id
├── status ENUM ('abierta','presupuestada','aceptada','en_obra','cerrada','descartada')
├── category_id            -- de qué va la consulta
├── property_city          -- ciudad, visible desde el inicio
├── property_address       -- EXACTA, protegida por RLS
├── last_message_at
└── UNIQUE(client_id, professional_id, created_at::date)  -- anti-spam

messages.conversation_id  -- reemplaza a project_id
quotes.conversation_id    -- el presupuesto nace en la conversación
projects.conversation_id  -- el proyecto cuelga de la conversación
```

### 3.2 Comisión por tramos

Eliminar las columnas GENERATED con el 10% fijo. Sustituir por:

```sql
commission_tiers
├── id, min_amount, max_amount, percentage
├── valid_from, valid_until     -- vigencia histórica
└── active

projects
├── applied_commission_pct      -- CONGELADO al aceptar el presupuesto
├── applied_commission_amount   -- calculado y guardado, no generado
```

Motivo: una columna GENERATED recalcularía comisiones antiguas si cambias las
tarifas. Fiscalmente inaceptable.

**Tramos propuestos (a validar):**

| Importe del trabajo | Comisión |
|---|---|
| Hasta 500 € | 10 % |
| 500 – 2.000 € | 7 % |
| 2.000 – 8.000 € | 4,5 % |
| Más de 8.000 € | 3 % (con tope máximo por proyecto) |

### 3.3 Suscripciones de profesional

No existe nada en el schema. Añadir:

```sql
subscription_plans
├── id, name, price_monthly, price_yearly
├── max_active_conversations    -- NULL = ilimitado
├── search_boost_weight         -- peso en el ranking del buscador
├── features (JSONB)            -- portfolio ampliado, badge, estadísticas...

professional_subscriptions
├── professional_id, plan_id
├── stripe_subscription_id
├── status, current_period_end
```

**Tensión a resolver:** cobrar suscripción *y* comisión puede percibirse como
doble cobro. Mitigación habitual: el plan de pago **reduce** la comisión.
Ej. Free = tramos completos; Pro = tramos −2 puntos. El pro paga la cuota
porque le sale a cuenta, no porque le obligues.

### 3.4 Otros añadidos

- `pro_availability` — franjas, urgencias sí/no, vacaciones.
- `verifications` — alta de autónomo, seguro de RC, NIF/CIF. Es lo que más
  convierte en este sector: el cliente teme al chapuzas, no al precio.
- `price_bands` por categoría en lugar de `hourly_rate` suelto (tu premisa de
  "nunca precio cerrado" está bien, pero el cliente necesita orientación).
- `disputes` — antes o después pasa. Mejor tenerlo previsto.

---

## 4. Riesgos de negocio

### 4.1 Fuga fuera de plataforma (el riesgo número uno)

Cliente y pro se conocen por el chat, intercambian teléfonos, pagan en efectivo,
tu comisión desaparece. **No se resuelve prohibiendo.** Se resuelve haciendo que
pagar dentro sea mejor para ambos:

- Para el cliente: garantía sobre el trabajo, mediación en disputas, factura.
- Para el pro: cobro asegurado, historial verificable que alimenta su reputación
  y le trae más clientes, contabilidad automática.

Complementario, no sustitutivo: detección de patrones de teléfono/email en el
chat antes de la fase aceptada, con aviso suave, no bloqueo.

### 4.2 Arranque en frío

En modelo directorio, sin profesionales no hay producto. Estrategia:
concentrarse en **una ciudad y tres especialidades** hasta tener densidad real,
antes de abrir a más. Un directorio nacional vacío mata la app.

### 4.3 Encaje legal (España)

- Stripe Connect resuelve el split y el KYC sin necesitar licencia de entidad de
  pago propia. Confirmar con asesoría antes de producción.
- Términos claros sobre el rol de la plataforma: **intermediaria**, no
  contratista. Esto delimita tu responsabilidad ante un trabajo defectuoso.
- RGPD: la dirección del inmueble es dato personal. El desbloqueo por fases
  ayuda, pero hace falta base legal y política de retención documentadas.

---

## 5. Plan de ejecución

Enfoque elegido: **pantalla por pantalla**, extrayendo tokens al `theme.ts`
sobre la marcha.

| # | Hito | Contenido |
|---|---|---|
| 0 | Consolidar repo | Aclarar qué rama es la buena, unificar en `main` |
| 1 | Buscador | Primera pantalla rediseñada. Define paleta, tipografía, tarjeta e iconos |
| 2 | Ficha de profesional | Portfolio, verificaciones, reseñas, CTA de contacto |
| 3 | `conversations` | Migración del schema + RLS de dirección protegida |
| 4 | Chat + andamio | Realtime, multimedia, componente de fases |
| 5 | Presupuestos | Emisión, versionado, aceptación |
| 6 | Pagos | Stripe Connect en modo test, tramos de comisión |
| 7 | Suscripciones | Planes de profesional y su efecto en el ranking |
| 8 | Backoffice | Métricas, disputas, verificaciones |

---

## 6. Decisiones pendientes

1. **¿Modelo directorio puro o híbrido con rescate por lead?**
2. **¿Los tramos de comisión propuestos son aceptables?** ¿Tope máximo?
3. **¿La suscripción reduce comisión, o son cobros independientes?**
4. **¿Ciudad y especialidades de lanzamiento?**
5. **¿Reseñas bidireccionales o solo cliente → profesional?**
6. **¿Quién marca el trabajo como terminado: cliente, pro, o ambos?**
   (Recomendado: el pro lo propone, el cliente lo confirma; si no responde en
   7 días, se autoconfirma. Evita que el pro quede sin cobrar por silencio.)
