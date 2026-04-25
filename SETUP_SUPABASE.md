# 🚀 GUÍA DE CONFIGURACIÓN - Supabase para Reforma360

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
1. En el dashboard, click en **"New Project"** (o el botón +)
2. Rellena:
   - **Project name:** `reforma360`
   - **Database Password:** genera una contraseña segura (guárdala en 1Password/LastPass)
   - **Region:** elige la más cercana (probablemente Europa/Ireland o Frankfurt)
   - **Pricing Plan:** Free (para empezar)
3. Click **"Create new project"**

⏳ Espera 2-5 minutos a que se cree la BD. Supabase te mostrará una página con el estado.

### Paso 1.3: Copiar credenciales
Una vez listo, verás el dashboard. En la esquina inferior izquierda, haz click en el icono de engranaje (⚙️) → **API**.

Copia y guarda en un fichero seguro:
- **Project URL:** `https://xxxxx.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (key pública para el cliente)
- **Service Role Key:** (no la uses desde la app, solo en backend)

---

## 2. Cargar el Esquema SQL

### Paso 2.1: Ir al editor SQL
En el dashboard de Supabase, en el menú izquierdo:
- Click en **"SQL Editor"**
- Click en **"+ New Query"**

### Paso 2.2: Pegar el esquema
1. En `reforma360_schema.sql` (el archivo que creé), copia TODO el contenido
2. Pégalo en el editor SQL de Supabase
3. Click en **"RUN"** (o Cmd+Enter)

⚠️ **Importante:** El script tiene comentarios. Si hay error, asegúrate de que no hay comandos incompletos.

### Paso 2.3: Verificar tablas creadas
En el menú izquierdo, click en **"Table Editor"**. Deberías ver todas estas tablas:
- users
- professional_profiles
- categories (ya con datos)
- professional_categories
- portfolio_items
- leads
- quotes
- projects
- payments
- reviews
- messages
- commissions
- verification_documents
- favorites
- notifications

✅ Si ves todas, el esquema está ok.

### Paso 2.4: Activar PostGIS (para búsqueda geoespacial)
Es opcional pero **muy recomendado** para un marketplace de reformas.

1. En Supabase, menú izquierdo → **"Extensions"**
2. Busca **"PostGIS"**
3. Click en ella y **"Enable Extension"**

Esto te permite hacer búsquedas tipo "profesionales dentro de 20 km de mi ubicación".

---

## 3. Configurar Autenticación

### Paso 3.1: Providers (Google, Apple, Email/Password)
En el menú izquierdo:
- Click en **"Authentication"**
- Click en **"Providers"**

#### Habilitador Email/Password (ya está por defecto):
1. Email/Password ya está habilitado
2. Desplázate hasta **"Email"** y asegúrate de que está en ON
3. En opciones, puedes habilitar **"Confirm email"** si quieres que confirmen el mail (recomendado para producción)

#### Habilitar Google (recomendado):
1. Click en **"Google"**
2. Sigue las instrucciones para crear credenciales OAuth en Google Cloud Console
3. Pega **Client ID** y **Client Secret**
4. Click **"Save"**

#### Habilitar Apple (si tienes Mac):
1. Click en **"Apple"**
2. Necesitarás Apple Developer account
3. Seguir instrucciones (es más complicado, puede esperar a v2)

### Paso 3.2: JWT Secret
Supabase genera esto automáticamente. No necesitas tocar nada. Es la clave que Supabase usa para firmar los tokens.

### Paso 3.3: Redirect URLs
En **"URL Configuration"** (dentro de Authentication):
- **Site URL:** `http://localhost:8081` (para testing local con Expo)
- **Redirect URLs (para producción):**
  - `app://splash` (iOS deep link)
  - `app+produción://splash` (Android deep link)
  - Más adelante quando publiques

---

## 4. Storage para Imágenes

### Paso 4.1: Crear buckets
En el menú izquierdo:
- Click en **"Storage"**
- Click en **"Create bucket"**

Crea estos buckets (nombres exactos):

1. **portfolio-images**
   - Public: NO (las fotos necesitan autenticación para ver)
   - File size limit: 50 MB

2. **lead-images**
   - Public: NO
   - File size limit: 50 MB

3. **verification-documents**
   - Public: NO (docs de verificación, muy privadas)
   - File size limit: 10 MB

4. **avatars**
   - Public: YES (los avatares pueden ser públicos)
   - File size limit: 5 MB

### Paso 4.2: Configurar RLS para Storage
Por cada bucket, click en él y luego **"Policies"** (pestaña):

**Para portfolio-images:**
```sql
-- SELECT: cualquiera autenticado puede ver
CREATE POLICY "Autenticados pueden ver portfolio"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'portfolio-images' 
  AND auth.role() = 'authenticated'
);

-- INSERT: solo el propietario
CREATE POLICY "Profesionales pueden subir sus fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND auth.uid() = (
    SELECT user_id FROM professional_profiles 
    WHERE id = (storage.foldername(name))[1]::uuid
  )
);
```

Para las demás, sigue el mismo patrón adaptado.

---

## 5. Realtime y RLS

### Paso 5.1: Habilitar Realtime
En el menú izquierdo:
- Click en **"Realtime"**
- Click en el nombre del proyecto
- En **"Replication"**, activa las tablas donde quieres que funcione realtime:
  - ✅ messages (para chat en vivo)
  - ✅ notifications
  - ✅ projects (para ver cambios de estado)
  - ✅ payments (para ver cuando se completa pago)

El resto pueden estar deshabilitadas para ahorrar recursos.

### Paso 5.2: Verificar RLS
En **"Table Editor"**, selecciona cada tabla. A la derecha, haz click en el icono de escudo 🛡️ (RLS).

Deberías ver:
- **Policies activas** para cada tabla
- El nombre y descripción de cada política

Si no las ves, significa que el script SQL no se ejecutó bien.

---

## 6. Variables de Entorno

### Paso 6.1: Crear fichero `.env.local`
En la raíz de tu proyecto React Native, crea un fichero `.env.local` (o `.env` dependiendo tu config):

```bash
# .env.local

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase (para Analytics, opcional)
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

# Stripe (lo agregaremos en fase de pagos)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

⚠️ **Importante:** 
- Prefija con `EXPO_PUBLIC_` si quieres que estén disponibles en el cliente (JavaScript)
- El **Anon Key** es seguro compartir (es pública)
- El **Service Role Key** NUNCA lo compartas ni lo commits

---

## 7. Pruebas Iniciales

### Prueba 7.1: Verificar conexión desde SQL Editor
En Supabase, **SQL Editor** → **New Query**:

```sql
SELECT COUNT(*) FROM categories;
-- Debería retornar 10 (las categorías que insertamos)

SELECT COUNT(*) FROM users;
-- Debería retornar 0 (aún no hay usuarios)
```

### Prueba 7.2: Crear un usuario de prueba (opcional)
En el menu izquierdo → **Authentication** → **Users**:
1. Click en **"Add user"**
2. Email: `test@example.com`
3. Password: `testPassword123`
4. Click **"Create user"**

Verás que se crea automáticamente una fila en la tabla `users` gracias a los triggers de Supabase.

### Prueba 7.3: Test de API desde JavaScript
Cuando hayas montado la app React Native, puedes probar así:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)

// Test 1: Listar categorías
const { data, error } = await supabase
  .from('categories')
  .select('*')

console.log('Categorías:', data) // Debería mostrar 10
console.log('Error:', error) // Debería ser null

// Test 2: Autenticación
const { data: auth, error: authError } = await supabase.auth.signUp({
  email: 'newuser@example.com',
  password: 'securePassword123'
})

console.log('User:', auth.user) // Nuevo usuario
```

---

## 8. Seguridad: Checklist antes de Producción

Antes de publicar a App Store / Google Play:

- [ ] Cambiar **JWT Secret** a algo único (Supabase lo hace automáticamente, pero verifica)
- [ ] Deshabilitar **"Confirm email"** en desarrollo, pero habilitarlo en producción
- [ ] Establecer **Rate Limits** en Auth (prevenir brute force)
- [ ] Revisar todas las políticas RLS (asegúrate de que son restrictivas)
- [ ] Cambiar Bucket Storage a **Public: NO** para todo excepto avatares
- [ ] Configurar **CORS** correctamente para tu dominio
- [ ] Activar **Database Webhooks** para auditoria (logs)

---

## 9. Monitoreo y Costos

### Panel de Control
En Supabase, ve a:
- **Home** → ves un resumen de uso
- **Reports** → estadísticas de queries, storage, etc.
- **Billing** → cuánto estás gastando

### Costos (Plan Free):
- Base de datos: 500 MB
- Storage: 1 GB
- Realtime: 2 GB/mes
- Auth: 50,000 usuarios

Es suficiente para MVP. Cuando crezcas, pasas a Pro (25 USD/mes).

---

## 10. Próximos Pasos

Una vez todo esto esté listo:

1. ✅ Esquema SQL creado
2. ✅ Auth configurado
3. ✅ Storage configurado
4. ✅ RLS habilitado
5. ✅ Variables de entorno guardadas
6. → **Crear proyecto React Native** (siguiente archivo)

---

**Cuando hayas completado todo esto, avísame y empezamos con la estructura de React Native.**
