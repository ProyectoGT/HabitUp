# Guía de Configuración — Supabase para HabitUp

## Tabla de Contenidos
1. [Crear Proyecto en Supabase](#1-crear-proyecto-en-supabase)
2. [Cargar el Esquema SQL](#2-cargar-el-esquema-sql)
3. [Configurar Autenticación](#3-configurar-autenticación)
4. [Storage para Imágenes](#4-storage-para-imágenes)
5. [Realtime y RLS](#5-realtime-y-rls)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Pruebas Iniciales](#7-pruebas-iniciales)

---

## 1. Crear Proyecto en Supabase

### Paso 1.1: Registrarse en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Haz click en **"Start your project"**
3. Usa GitHub, Google o crea cuenta con email
4. Verifica tu email

### Paso 1.2: Crear nuevo Proyecto
1. En el dashboard, click en **"New Project"**
2. Rellena:
   - **Project name:** `habitup`
   - **Database Password:** genera una contraseña segura
   - **Region:** elige la más cercana (Europa/Ireland o Frankfurt)
   - **Pricing Plan:** Free (para empezar)
3. Click **"Create new project"**

⏳ Espera 2-5 minutos a que se cree la BD.

### Paso 1.3: Copiar credenciales
Una vez listo, ve a **Project Settings → API**. Copia y guarda:
- **Project URL:** `https://xxxxx.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (pública para el cliente)
- **Service Role Key:** solo para Edge Functions, nunca en la app

---

## 2. Cargar el Esquema SQL

### Opción A: Desde cero (proyecto nuevo)
Aplica las migraciones en orden desde el SQL Editor:

1. `habitup/supabase/migrations/000_schema_base.sql`
2. `habitup/supabase/migrations/001_add_push_notifications.sql`
3. `habitup/supabase/migrations/002_mvp_core_loop.sql`

### Opción B: Schema completo (atajo)
Si prefieres aplicar todo de una vez, usa `supabase/habitup_schema.sql` (incluye schema base + push notifications).

### Verificar tablas creadas
En Table Editor deberías ver:
- users, categories, professional_profiles, professional_categories
- leads, quotes, projects, messages, reviews, notifications, portfolio_items

---

## 3. Configurar Autenticación

### Proveedores
En **Authentication → Providers**:

- **Email/Password:** ya activo por defecto. Opcional: activa "Confirm email" para producción.
- **Google:** sigue instrucciones para crear OAuth credentials en Google Cloud Console.
- **Apple:** requiere Apple Developer account (puede esperar a v2).

### Redirect URLs
En **URL Configuration**:
- **Site URL:** `http://localhost:8081` (desarrollo local con Expo)
- **Redirect URLs (producción):** las que genere el deploy de tu app

---

## 4. Storage para Imágenes

### Buckets
Crea estos buckets en **Storage**:

| Bucket | Público | Límite | Uso |
|--------|---------|--------|-----|
| `lead-photos` | No | 50 MB | Fotos de solicitudes |
| `portfolio` | No | 50 MB | Portfolio de profesionales |
| `verification-documents` | No | 10 MB | Documentos de verificación |
| `avatars` | Sí | 5 MB | Fotos de perfil |

### RLS para Storage
Ejemplo para `portfolio` (ajusta para cada bucket):

```sql
CREATE POLICY "Autenticados pueden ver portfolio"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio' AND auth.role() = 'authenticated');
```

---

## 5. Realtime y RLS

### Activar Realtime
En **Database → Replication**, activa:
- ✅ `messages`
- ✅ `notifications`

### RLS
Ya viene configurado en las migraciones. Verifica que cada tabla tenga el escudo 🛡️ activo en Table Editor.

---

## 6. Variables de Entorno

Copia `habitup/.env.example` a `habitup/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EXPO_PUBLIC_SUPABASE_PROJECT_ID=tu-ref
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_PROJECT_ID=tu-expo-project-id
```

⚠️ **Nunca** comitear `.env.local`. El `EXPO_PUBLIC_` prefijo lo hace disponible en el cliente.

---

## 7. Pruebas Iniciales

Desde el SQL Editor:
```sql
SELECT COUNT(*) FROM categories; -- Debería devolver 15
SELECT COUNT(*) FROM users;      -- 0 (aún sin usuarios)
```

Puedes añadir un usuario de prueba desde **Authentication → Users → Add user**.

---

## 8. Seguridad: Checklist pre-producción

- [ ] Verificar RLS activo en todas las tablas
- [ ] Buckets de Storage con acceso restringido
- [ ] Rate Limits en Auth
- [ ] CORS configurado para tu dominio
- [ ] Confirmación de email activada

---

> **Schema canónico:** `habitup/supabase/migrations/000_schema_base.sql`
> Las migraciones son la fuente de verdad. `supabase/habitup_schema.sql` es un snapshot acumulativo.
