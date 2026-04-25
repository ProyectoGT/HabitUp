# 📊 ARQUITECTURA DE DATOS - Reforma360

## Índice
1. [Visión General](#visión-general)
2. [Tablas Principales](#tablas-principales)
3. [Flujos de Datos](#flujos-de-datos)
4. [Políticas de Seguridad (RLS)](#políticas-de-seguridad)
5. [Ejemplos de Queries](#ejemplos-de-queries)
6. [Consideraciones de Rendimiento](#consideraciones-de-rendimiento)

---

## 🎯 Visión General

La base de datos está diseñada para soportar un **marketplace de doble cara** (cliente ↔ profesional) con estas características clave:

- **Autenticación**: users + Firebase Auth (integrado con Supabase)
- **Perfiles**: profesionales con verificación, geolocalización y ratings
- **Búsqueda**: leads (solicitudes) y profesionales
- **Contratación**: flujo quote → proyecto → pago → reseña
- **Monetización**: comisiones automáticas por pago
- **Mensajería**: chat en tiempo real entre partes
- **Notificaciones**: automáticas en eventos clave

### Diagrama de Flujo Principal

```
Cliente crea LEAD
    ↓
Profesionales ven LEAD → envían QUOTE
    ↓
Cliente ACEPTA QUOTE
    ↓
Se crea PROJECT
    ↓
Cliente PAGA (Stripe) → se crea PAYMENT
    ↓
Profesional realiza trabajo
    ↓
Cliente cierra proyecto (status = 'completado')
    ↓
Cliente puede DEJAR RESEÑA
    ↓
Sistema calcula COMISIÓN y la transfiere
```

---

## 📋 Tablas Principales

### 1. **users**
Tabla central de autenticación y perfiles de usuario.

```sql
users
├── id (UUID) — sync con auth.uid() de Firebase/Supabase
├── email (VARCHAR) — único
├── full_name (VARCHAR)
├── phone (VARCHAR)
├── avatar_url (TEXT)
├── user_type ENUM ('cliente', 'professional', 'admin')
├── bio (TEXT) — biografía breve
├── is_verified (BOOLEAN) — verificación KYC
├── created_at, updated_at, deleted_at
```

**Notas importantes:**
- El `id` es UUID y debe coincidir con `auth.uid()` de Firebase. Supabase gestiona esto automáticamente.
- `user_type` determina los permisos en la app.
- `deleted_at` para soft-delete (no eliminar de verdad, por auditoría).

**Queries desde la app:**
```javascript
// Obtener perfil del usuario actual
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', auth.currentUser.uid)
  .single();

// Buscar un usuario por email (para verificación)
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'example@mail.com')
  .single();
```

---

### 2. **professional_profiles**
Datos específicos de cada profesional.

```sql
professional_profiles
├── id (UUID)
├── user_id (UUID FK → users.id) — UNIQUE
├── company_name (VARCHAR)
├── company_type ENUM ('autonomo', 'empresa')
├── nif_cif (VARCHAR) — verificación fiscal
├── description (TEXT)
├── experience_years (INT)
├── avg_rating (DECIMAL 3,2) — 0.00 a 5.00
├── total_reviews (INT)
├── total_projects_completed (INT)
├── response_time_hours (INT)
├── location_* (ciudad, región, país, lat, lon)
├── service_radius_km (INT) — radio de trabajo
├── website_url, instagram_url, facebook_url, linkedin_url
├── is_active (BOOLEAN)
├── accepts_new_leads (BOOLEAN)
├── hourly_rate (DECIMAL) — tarifa (opcional)
```

**Relaciones:**
- `user_id` → users (1:1)
- ← professional_categories (1:N)
- ← portfolio_items (1:N)
- ← projects (1:N)

**Queries desde la app:**

```javascript
// Obtener perfil del profesional actual
const { data: profile } = await supabase
  .from('professional_profiles')
  .select('*')
  .eq('user_id', auth.currentUser.uid)
  .single();

// Buscar profesionales en una categoría
const { data: professionals } = await supabase
  .from('professionals_with_categories') // Vista
  .select('*')
  .eq('location_city', 'Barcelona')
  .contains('categories', 'Fontanería')
  .gte('avg_rating', 4.0)
  .order('avg_rating', { ascending: false });

// Buscar profesionales por proximidad (PostGIS)
const { data: nearby } = await supabase
  .rpc('nearby_professionals', {
    lat: 41.3851,
    lng: 2.1734,
    radius_km: 20,
    category_slug: 'fontaneria'
  });
```

**Para la búsqueda por proximidad, necesitas esta función SQL:**

```sql
CREATE OR REPLACE FUNCTION nearby_professionals(
  lat DECIMAL,
  lng DECIMAL,
  radius_km INT DEFAULT 50,
  category_slug VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name VARCHAR,
  avg_rating DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.user_id,
    u.full_name,
    pp.avg_rating,
    ROUND(earth_distance(ll_to_earth($1, $2), ll_to_earth(pp.location_latitude, pp.location_longitude)) / 1000, 2)::DECIMAL AS distance_km
  FROM professional_profiles pp
  JOIN users u ON pp.user_id = u.id
  LEFT JOIN professional_categories pc ON pp.id = pc.professional_id
  LEFT JOIN categories c ON pc.category_id = c.id
  WHERE earth_box(ll_to_earth($1, $2), $3 * 1000) @> ll_to_earth(pp.location_latitude, pp.location_longitude)
    AND (category_slug IS NULL OR c.slug = category_slug)
    AND pp.is_active = TRUE
  ORDER BY earth_distance(ll_to_earth($1, $2), ll_to_earth(pp.location_latitude, pp.location_longitude)) ASC;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. **categories**
Catálogo de especialidades de reforma.

```sql
categories
├── id (UUID)
├── name (VARCHAR UNIQUE) — "Fontanería"
├── slug (VARCHAR UNIQUE) — "fontaneria"
├── description (TEXT)
├── icon_url (TEXT) — URL del icono
├── is_active (BOOLEAN)
```

**Ya vienen pre-pobladas:** Fontanería, Electricidad, Carpintería, etc.

---

### 4. **professional_categories**
Tabla de asociación: cada profesional puede tener múltiples especialidades.

```sql
professional_categories
├── id (UUID)
├── professional_id (FK → professional_profiles.id)
├── category_id (FK → categories.id)
├── years_in_category (INT)
├── is_primary (BOOLEAN) — especialidad principal
├── UNIQUE(professional_id, category_id)
```

**Ejemplo:**
- Carlos Martínez es fontanero (15 años, principal) Y electricista (5 años, secundaria)
- Se guardan en dos filas en esta tabla

---

### 5. **leads**
Solicitudes de presupuesto publicadas por clientes.

```sql
leads
├── id (UUID)
├── client_id (FK → users.id)
├── category_id (FK → categories.id)
├── title (VARCHAR) — "Cambiar grifo de cocina"
├── description (TEXT) — detalles del trabajo
├── budget_min, budget_max (DECIMAL)
├── location_* (ciudad, lat, lon)
├── preferred_start_date (DATE)
├── urgency ENUM ('baja', 'media', 'alta')
├── photos (JSONB) — URLs de fotos del lugar
├── status ENUM ('activo', 'en_negociacion', 'asignado', 'cerrado', 'cancelado')
├── assigned_professional_id (FK)
├── is_featured (BOOLEAN) — si pago para destacar
├── views_count (INT)
```

**Flujo:**
1. Cliente crea lead con status = 'activo'
2. Profesionales ven el lead y envían quotes
3. Lead pasa a 'en_negociacion' si hay quotes
4. Si cliente acepta quote → 'asignado'
5. Si se crea proyecto → 'cerrado'

**Queries:**

```javascript
// Cliente crea un lead
const { data: lead, error } = await supabase
  .from('leads')
  .insert({
    client_id: auth.currentUser.uid,
    category_id: 'uuid-de-fontaneria',
    title: 'Cambiar grifo de cocina',
    description: 'Necesito cambiar el grifo...',
    budget_min: 100,
    budget_max: 300,
    location_city: 'Barcelona',
    location_latitude: 41.3851,
    location_longitude: 2.1734,
    urgency: 'media'
  });

// Profesional ve todos los leads activos en su categoría
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'activo')
  .eq('category_id', 'uuid-fontaneria')
  .order('created_at', { ascending: false })
  .limit(20);

// Cliente ve sus propios leads
const { data: myLeads } = await supabase
  .from('leads')
  .select('*')
  .eq('client_id', auth.currentUser.uid)
  .order('created_at', { ascending: false });
```

---

### 6. **quotes**
Presupuestos que envían los profesionales en respuesta a un lead.

```sql
quotes
├── id (UUID)
├── lead_id (FK → leads.id)
├── professional_id (FK → professional_profiles.id)
├── amount (DECIMAL) — 1500.00 EUR
├── description (TEXT) — descripción de qué incluye
├── delivery_days (INT) — "5 días"
├── includes_materials (BOOLEAN)
├── payment_terms (VARCHAR)
├── status ENUM ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado')
├── expires_at (TIMESTAMP) — válido hasta...
```

**Flujo:**
1. Profesional ve un lead interesante
2. Envía quote con status = 'enviado'
3. Cliente ve quote → status = 'visto'
4. Cliente acepta → status = 'aceptado' → **se crea PROJECT**
5. O cliente rechaza → status = 'rechazado' + rejection_reason

---

### 7. **projects**
El contrato cerrado entre cliente y profesional.

```sql
projects
├── id (UUID)
├── lead_id (FK) — de dónde vino
├── quote_id (FK) — presupuesto aceptado
├── client_id (FK → users.id)
├── professional_id (FK → professional_profiles.id)
├── title, description, agreed_price
├── start_date, expected_end_date, actual_end_date
├── status ENUM ('pendiente', 'en_curso', 'pausado', 'completado', 'cancelado')
├── platform_commission_percentage (DECIMAL) — 10%
├── platform_commission_amount (GENERATED) — precio * 10% / 100
├── professional_receives (GENERATED) — precio - comisión
├── payment_status ENUM ('pendiente', 'en_proceso', 'completado', 'fallido')
```

**Importante:**
- `platform_commission_amount` y `professional_receives` son **GENERATED** (calculadas automáticamente)
- El cliente paga `agreed_price`, tú recibes la comisión, el profesional recibe `professional_receives`

**Queries:**

```javascript
// Cliente ve sus proyectos
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    professional:professional_profiles(*, user:users(*))
  `)
  .eq('client_id', auth.currentUser.uid);

// Profesional ve sus proyectos activos
const { data: activeProjects } = await supabase
  .from('projects')
  .select('*')
  .eq('professional_id', professionalId)
  .in('status', ['pendiente', 'en_curso'])
  .order('created_at', { ascending: false });

// Marcar proyecto como completado (solo después del pago)
const { data, error } = await supabase
  .from('projects')
  .update({ status: 'completado', actual_end_date: new Date() })
  .eq('id', projectId)
  .eq('payment_status', 'completado');
```

---

### 8. **payments**
Registro de todas las transacciones (Stripe).

```sql
payments
├── id (UUID)
├── project_id (FK)
├── client_id, professional_id (FKs)
├── amount (DECIMAL) — lo que cobra el cliente
├── gross_amount — total a pagar (puede incluir IVA)
├── commission_amount — lo que se queda la plataforma
├── professional_amount — lo que recibe el profesional
├── stripe_payment_intent_id (VARCHAR UNIQUE)
├── stripe_transfer_id (VARCHAR) — Transfer de Stripe
├── status ENUM ('pendiente', 'procesando', 'completado', 'fallido', 'reembolsado')
├── paid_at, transferred_to_professional_at (TIMESTAMP)
```

**Flujo (Stripe Connect):**

1. Cliente inicia pago → se crea payment con status = 'pendiente'
2. Stripe procesa → webhook actualiza a status = 'completado'
3. Trigger automático crea COMMISSION
4. Otra función automática crea Transfer a cuenta del profesional

**Queries:**

```javascript
// Ver estado de un pago
const { data: payment } = await supabase
  .from('payments')
  .select('*')
  .eq('stripe_payment_intent_id', intentId)
  .single();

// Listar pagos completados de un proyecto
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('project_id', projectId)
  .eq('status', 'completado')
  .order('created_at', { ascending: false });
```

---

### 9. **reviews**
Reseñas de clientes sobre profesionales (solo después de proyecto completado).

```sql
reviews
├── id (UUID)
├── project_id (FK UNIQUE) — una reseña por proyecto
├── reviewer_id (FK → users.id) — el cliente
├── professional_id (FK)
├── rating (INT 1-5) — la calidad general
├── title, comment (TEXT)
├── rating_quality, rating_communication, rating_timeline, rating_value (INT 1-5)
├── photos (JSONB) — fotos finales del trabajo
├── is_verified_purchase (BOOLEAN) — TRUE si el pago fue completado
├── helpful_count (INT)
```

**Importante:**
- Solo se puede crear review si el proyecto está en status = 'completado'
- La review es ÚNICA por proyecto (`UNIQUE(project_id)`)
- Trigger automático actualiza `professional_profiles.avg_rating` cuando se crea

**Queries:**

```javascript
// Obtener todas las reseñas de un profesional
const { data: reviews } = await supabase
  .from('reviews')
  .select(`
    *,
    reviewer:users(full_name, avatar_url)
  `)
  .eq('professional_id', professionalId)
  .order('created_at', { ascending: false });

// Cliente deja reseña después de proyecto completado
const { data: review, error } = await supabase
  .from('reviews')
  .insert({
    project_id: projectId,
    reviewer_id: auth.currentUser.uid,
    professional_id: professionalId,
    rating: 5,
    title: 'Trabajo excelente',
    comment: 'Carlos fue muy profesional...',
    rating_quality: 5,
    rating_communication: 4,
    rating_timeline: 5,
    rating_value: 5,
    is_verified_purchase: true
  });
```

---

### 10. **messages**
Chat entre cliente y profesional sobre un proyecto.

```sql
messages
├── id (UUID)
├── project_id (FK) — contexto del mensaje
├── sender_id, recipient_id (FKs → users.id)
├── message_type ENUM ('text', 'image', 'file', 'quote_notification')
├── content (TEXT)
├── attachment_url (TEXT) — si es image o file
├── is_read (BOOLEAN)
├── read_at (TIMESTAMP)
```

**Realtime desde la app:**

```javascript
// Escuchar nuevos mensajes de un proyecto en tiempo real
const subscription = supabase
  .from('messages')
  .on('*', payload => {
    if (payload.new.project_id === projectId) {
      console.log('Nuevo mensaje:', payload.new);
    }
  })
  .subscribe();

// Enviar mensaje
const { data, error } = await supabase
  .from('messages')
  .insert({
    project_id: projectId,
    sender_id: auth.currentUser.uid,
    recipient_id: recipientId,
    message_type: 'text',
    content: 'Hola, ¿cuándo puedes venir?'
  });

// Marcar como leído
await supabase
  .from('messages')
  .update({ is_read: true, read_at: new Date() })
  .eq('id', messageId);
```

---

### 11. **commissions**
Registro automático de comisiones generadas por el sistema.

```sql
commissions
├── id (UUID)
├── payment_id (FK UNIQUE)
├── project_id (FK)
├── amount (DECIMAL) — 150.00 (10% de 1500)
├── percentage (DECIMAL) — 10.00
├── status ENUM ('pendiente', 'transferencia_iniciada', 'completada', 'fallida')
├── stripe_transfer_id (VARCHAR)
├── transferred_at (TIMESTAMP)
```

**Automático:** se crea cuando payment.status = 'completado'

---

### 12. **notifications**
Notificaciones push para los usuarios.

```sql
notifications
├── id (UUID)
├── user_id (FK)
├── type (VARCHAR) — 'new_quote', 'project_started', 'review_received', 'message_received'
├── title, message (TEXT)
├── related_id (UUID) — ID del quote/review/message
├── is_read (BOOLEAN)
```

**Se crean automáticamente por triggers:**
- Cuando se envía un quote al cliente
- Cuando un proyecto cambia de estado
- Cuando se recibe una reseña

---

## 🔄 Flujos de Datos

### Flujo 1: Cliente busca profesional → Lead → Quote → Proyecto → Pago → Reseña

```
1. BÚSQUEDA
   └─ Cliente usa filtros (ciudad, categoría, rating)
   └─ SELECT profesionales WHERE location_city = X AND category = Y

2. CLIENTE CREA LEAD
   └─ INSERT INTO leads
   └─ Profesionales reciben NOTIFICACIÓN
   └─ Actualiza leads.views_count

3. PROFESIONAL ENVÍA QUOTE
   └─ INSERT INTO quotes (status = 'enviado')
   └─ Cliente recibe NOTIFICACIÓN
   └─ Actualiza lead.status = 'en_negociacion'

4. CLIENTE ACEPTA QUOTE
   └─ UPDATE quotes (status = 'aceptado')
   └─ INSERT INTO projects (quote_id = accepted_quote_id)
   └─ UPDATE leads (status = 'asignado')

5. PAGO (Stripe)
   └─ Cliente inicia pago en la app
   └─ Stripe crea PaymentIntent
   └─ App crea registro en payments (status = 'pendiente')
   └─ Webhook de Stripe confirma pago
   └─ UPDATE payments (status = 'completado')
   └─ TRIGGER: CREATE commission
   └─ TRIGGER: CREATE transfer to professional

6. PROYECTO EN CURSO
   └─ UPDATE projects (status = 'en_curso')
   └─ Chat entre cliente y profesional via messages

7. PROYECTO COMPLETADO
   └─ UPDATE projects (status = 'completado')
   └─ Cliente puede dejar REVIEW

8. RESEÑA
   └─ INSERT INTO reviews
   └─ TRIGGER: UPDATE professional_profiles.avg_rating
   └─ TRIGGER: UPDATE professional_profiles.total_reviews
```

---

## 🔒 Políticas de Seguridad

Las políticas RLS garantizan que:

- **Un cliente solo ve sus propios leads y proyectos**
- **Un profesional solo ve leads de su categoría y sus propios proyectos**
- **Los mensajes son visibles solo para remitente y destinatario**
- **Las reseñas son públicas pero se vinculan al proyecto**

**Importante:** todas las queries desde la app automáticamente filtran por `auth.uid()` gracias a las políticas RLS. No necesitas validar manualmente.

---

## 📝 Ejemplos de Queries

### Profesional: Ver leads pendientes en su categoría
```javascript
const { data: leads } = await supabase
  .from('leads')
  .select(`
    *,
    category:categories(name, slug),
    client:users(full_name, avatar_url)
  `)
  .eq('status', 'activo')
  .eq('category_id', profesionalCategoryId)
  .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // últimos 30 días
  .order('created_at', { ascending: false })
  .limit(20);
```

### Cliente: Ver profesionales cercanos con buenas reseñas
```javascript
const { data: professionals } = await supabase
  .rpc('nearby_professionals', {
    lat: 41.3851,
    lng: 2.1734,
    radius_km: 20,
    category_slug: 'fontaneria'
  })
  .then(({ data }) => 
    // Filtrar por rating en la app (o extender la función)
    data.filter(p => p.avg_rating >= 4.0)
  );
```

### Profesional: Ingresos mensuales
```javascript
const { data: income } = await supabase
  .from('payments')
  .select(`
    *,
    commission:commissions(*)
  `)
  .eq('professional_id', professionalId)
  .eq('status', 'completado')
  .gte('created_at', '2024-01-01')
  .lte('created_at', '2024-01-31');
  
const totalIncome = income.reduce((sum, p) => sum + p.professional_amount, 0);
const totalCommissions = income.reduce((sum, p) => sum + p.commission.amount, 0);
```

---

## ⚡ Consideraciones de Rendimiento

### Índices
Están configurados para:
- Búsquedas por user_type, status, is_verified
- Ordenamientos por rating, fecha
- Filtros por ciudad, categoría
- Búsquedas geoespaciales (PostGIS)

### Vistas Materializadas (Opcional)
Si tienes muchos datos, puedes crear vistas materializadas para:
- `professionals_with_categories` — refrescar cada 1 hora
- `professional_project_summary` — refrescar cada 24 horas

### Paginación
Siempre usa `.limit()` y `.offset()` en queries grandes:

```javascript
const pageSize = 20;
const page = 1;

const { data, count } = await supabase
  .from('leads')
  .select('*', { count: 'exact' })
  .eq('status', 'activo')
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .order('created_at', { ascending: false });
```

### Caching
Desde la app, cachea:
- Lista de categorías (rara vez cambia)
- Perfil del usuario logueado
- Ubicación (refrescar cada 5 min si es necesario)

---

## 🚀 Siguientes Pasos

Una vez confirmes que el esquema está bien en Supabase:

1. **Crear la tabla `auth.users`** de Firebase/Supabase (automático)
2. **Configurar RLS en todas las tablas** (incluido en el script)
3. **Crear Storage bucket** para fotos (portfolio, leads, reviews)
4. **Configurar webhooks de Stripe** para actualizar payments
5. **Crear Edge Functions** para:
   - Validar DNI/CIF
   - Crear transfers en Stripe
   - Notificaciones push vía OneSignal/FCM

---

**Próximo paso:** Cuando me confirmes que el schema está creado en Supabase, empezamos con la estructura del proyecto React Native.
