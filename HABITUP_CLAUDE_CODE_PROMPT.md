# 🚀 HabitUp — Prompt Maestro para Claude Code
> Misión: llevar HabitUp de fase de planificación a una app React Native funcional, segura y lista para producción.

---

## 📋 CONTEXTO DEL PROYECTO

HabitUp es un **marketplace móvil (iOS + Android)** que conecta profesionales de reformas y rehabilitación de viviendas con clientes particulares. Funciona como Habitissimo/Cronoshare con modelo propio:

- Clientes publican **leads** (solicitudes de presupuesto)
- Profesionales responden con **quotes** (presupuestos)
- Cliente acepta → se crea **proyecto** → pago vía Stripe Connect
- La plataforma cobra **10% de comisión** sobre cada pago completado
- Sistema de **reseñas verificadas** al completar proyectos

**Stack:**
- React Native + Expo SDK 51+ (TypeScript estricto)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Zustand (estado global)
- React Navigation v6 (Stack + Bottom Tabs)
- React Hook Form + Zod (formularios)
- NativeWind (estilos)
- Stripe Connect via Supabase Edge Functions
- Expo Notifications + OneSignal

**Repo:** `github.com/ProyectoGT/HabitUp`
**Directorio de la app:** `habitup/`
**Directorio Supabase:** `supabase/`

---

## 🗂️ FASE 0 — LIMPIEZA Y REORGANIZACIÓN OBLIGATORIA

Antes de escribir cualquier código nuevo, ejecuta estas tareas de saneamiento:

### 0.1 Renombrar archivos con nombre incorrecto
```bash
# En la raíz del repo:
mv reforma360_schema.sql supabase/schema/habitup_schema.sql
```

En `ARQUITECTURA_DATOS.md`, reemplaza TODAS las ocurrencias de "Reforma360" / "reforma360" por "HabitUp" / "habitup".

### 0.2 Crear CLAUDE.md en la raíz
Crea `/CLAUDE.md` con el contenido de `HABITUP_CONTEXT_PROMPT.md` renombrado y actualizado. Claude Code auto-carga `CLAUDE.md` al arrancar — sin esto no tiene contexto del proyecto.

### 0.3 Crear estructura de carpetas de la app
```
habitup/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (client)/
│   │   ├── _layout.tsx
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
│   ├── (professional)/
│   │   ├── _layout.tsx
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
│   ├── components/
│   │   ├── ui/
│   │   ├── professionals/
│   │   ├── leads/
│   │   └── chat/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── config/
├── supabase/
│   ├── schema/
│   │   └── habitup_schema.sql
│   ├── migrations/
│   └── functions/
│       ├── stripe-webhook/
│       └── create-payment-intent/
└── assets/
```

---

## 🗄️ FASE 1 — CORREGIR EL ESQUEMA SQL (CRÍTICO)

**Este es el trabajo más importante. El esquema actual tiene 5 bugs críticos que romperían la app en producción.**

### 1.1 Corregir la Primary Key de `users` — BUG CRÍTICO

**Problema:** `id UUID PRIMARY KEY DEFAULT auth.uid()` — `auth.uid()` retorna NULL en contextos sin sesión (Edge Functions con service role, triggers, inserts server-side). La PK del usuario sería NULL.

**Solución:** Usar `gen_random_uuid()` y sincronizar via trigger desde `auth.users`:

```sql
-- CORRECCIÓN: tabla users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... resto de columnas igual
);

-- Trigger que crea el perfil automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
```

### 1.2 Añadir trigger updated_at en TODAS las tablas — BUG IMPORTANTE

**Problema:** `updated_at` nunca se actualiza automáticamente — siempre tiene la fecha de creación.

```sql
-- Función reutilizable
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a cada tabla con updated_at
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Corregir el trigger de pago→proyecto — BUG DE LÓGICA DE NEGOCIO

**Problema:** El trigger marca el proyecto como `completado` cuando el pago se completa. Pero pago ≠ trabajo terminado. El cliente podría pagar por adelantado.

**Corrección:** Solo actualizar `payment_status`, nunca `status` del proyecto:

```sql
-- ELIMINAR el trigger incorrecto
DROP TRIGGER IF EXISTS mark_project_completed_trigger ON payments;
DROP FUNCTION IF EXISTS mark_project_as_completed_after_payment();

-- REEMPLAZAR por uno correcto que solo actualiza payment_status
CREATE OR REPLACE FUNCTION sync_project_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status != 'completado' THEN
    UPDATE projects
    SET payment_status = 'completado',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.project_id;
  ELSIF NEW.status = 'fallido' THEN
    UPDATE projects
    SET payment_status = 'fallido',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_payment_status_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_project_payment_status();
```

### 1.4 Corregir trigger mark_quote_as_viewed — BUG

**Problema:** Sobreescribe `viewed_at` en cada update aunque ya estuviera establecida.

```sql
DROP TRIGGER IF EXISTS mark_quote_viewed_trigger ON quotes;
DROP FUNCTION IF EXISTS mark_quote_as_viewed();

CREATE OR REPLACE FUNCTION mark_quote_as_viewed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo establecer viewed_at la primera vez que cambia de 'enviado'
  IF NEW.status IN ('visto', 'aceptado', 'rechazado') AND OLD.viewed_at IS NULL THEN
    NEW.viewed_at = CURRENT_TIMESTAMP;
  END IF;
  -- Establecer accepted_at/rejected_at correctamente
  IF NEW.status = 'aceptado' AND OLD.status != 'aceptado' THEN
    NEW.accepted_at = CURRENT_TIMESTAMP;
  END IF;
  IF NEW.status = 'rechazado' AND OLD.status != 'rechazado' THEN
    NEW.rejected_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_quote_viewed_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION mark_quote_as_viewed();
```

### 1.5 Añadir constraints faltantes

```sql
-- Un quote solo puede generar un proyecto
ALTER TABLE projects ADD CONSTRAINT projects_quote_id_unique UNIQUE (quote_id);

-- Validar que professional_profiles solo lo crean usuarios de tipo 'professional'
-- (se controlará via RLS, no via constraint — ver Fase 2)

-- Añadir check para evitar leads con budget_min > budget_max
ALTER TABLE leads ADD CONSTRAINT leads_budget_check
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max);

-- Añadir check para ratings en reviews (ya existe rating, añadir avg)
-- (Ya cubierto por CHECK existentes)
```

### 1.6 Convertir el schema monolítico a migraciones de Supabase

```bash
# En el directorio supabase/
supabase migration new initial_schema
# Copiar el contenido del schema corregido al archivo de migración generado
# Desde este punto, TODOS los cambios son nuevas migraciones — nunca editar las anteriores
```

---

## 🔒 FASE 2 — REESCRIBIR EL RLS COMPLETO (CRÍTICO)

**El RLS actual tiene fallos que harían la app completamente inoperativa. Reescribirlo desde cero.**

**Regla de oro:** Habilitar RLS en TODAS las tablas. Definir políticas para cada operación (SELECT, INSERT, UPDATE, DELETE) en cada tabla. Si una tabla tiene RLS activo y ninguna política, está bloqueada para todos.

```sql
-- =====================================================
-- HABILITAR RLS en todas las tablas
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function para obtener el professional_profile.id del usuario actual
CREATE OR REPLACE FUNCTION auth_professional_id()
RETURNS UUID AS $$
  SELECT id FROM professional_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: obtener el user_type del usuario actual
CREATE OR REPLACE FUNCTION auth_user_type()
RETURNS VARCHAR AS $$
  SELECT user_type FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- TABLA: users
-- =====================================================
CREATE POLICY "users_select_own_and_professionals"
  ON users FOR SELECT USING (
    auth.uid() = id
    OR user_type IN ('professional', 'admin')
  );

CREATE POLICY "users_insert_own"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================
-- TABLA: categories (pública para lectura)
-- =====================================================
CREATE POLICY "categories_select_all"
  ON categories FOR SELECT USING (is_active = TRUE);

-- Solo admins pueden crear/editar categorías
CREATE POLICY "categories_admin_write"
  ON categories FOR ALL USING (auth_user_type() = 'admin');

-- =====================================================
-- TABLA: professional_profiles
-- =====================================================
-- Todos pueden ver perfiles activos de profesionales
CREATE POLICY "professional_profiles_select_active"
  ON professional_profiles FOR SELECT USING (
    is_active = TRUE
    OR user_id = auth.uid()
  );

-- Solo el propio profesional puede crear/editar su perfil
CREATE POLICY "professional_profiles_insert_own"
  ON professional_profiles FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND auth_user_type() = 'professional'
  );

CREATE POLICY "professional_profiles_update_own"
  ON professional_profiles FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- TABLA: professional_categories
-- =====================================================
CREATE POLICY "professional_categories_select_all"
  ON professional_categories FOR SELECT USING (TRUE);

CREATE POLICY "professional_categories_manage_own"
  ON professional_categories FOR ALL USING (
    professional_id = auth_professional_id()
  );

-- =====================================================
-- TABLA: portfolio_items
-- =====================================================
CREATE POLICY "portfolio_items_select_all"
  ON portfolio_items FOR SELECT USING (TRUE);

CREATE POLICY "portfolio_items_manage_own"
  ON portfolio_items FOR ALL USING (
    professional_id = auth_professional_id()
  );

-- =====================================================
-- TABLA: leads
-- =====================================================
-- Clientes ven sus propios leads
CREATE POLICY "leads_select_own_client"
  ON leads FOR SELECT USING (client_id = auth.uid());

-- Profesionales ven leads activos + los que tienen asignados
CREATE POLICY "leads_select_professional"
  ON leads FOR SELECT USING (
    auth_user_type() = 'professional'
    AND (status = 'activo' OR assigned_professional_id = auth_professional_id())
  );

-- Solo clientes pueden crear leads
CREATE POLICY "leads_insert_client"
  ON leads FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND auth_user_type() = 'cliente'
  );

-- El cliente puede actualizar su propio lead (cancelar, etc.)
CREATE POLICY "leads_update_own_client"
  ON leads FOR UPDATE USING (
    client_id = auth.uid()
    AND status NOT IN ('asignado', 'cerrado') -- No editar si ya está contratado
  );

-- =====================================================
-- TABLA: quotes
-- =====================================================
-- El cliente ve los quotes de sus leads; el profesional ve los suyos
CREATE POLICY "quotes_select"
  ON quotes FOR SELECT USING (
    professional_id = auth_professional_id()
    OR lead_id IN (SELECT id FROM leads WHERE client_id = auth.uid())
  );

-- Solo profesionales pueden enviar quotes
CREATE POLICY "quotes_insert_professional"
  ON quotes FOR INSERT WITH CHECK (
    professional_id = auth_professional_id()
    AND auth_user_type() = 'professional'
  );

-- El profesional puede actualizar su propio quote (solo si no está aceptado)
CREATE POLICY "quotes_update_own"
  ON quotes FOR UPDATE USING (
    professional_id = auth_professional_id()
    AND status NOT IN ('aceptado', 'rechazado', 'expirado')
  );

-- El cliente puede actualizar el estado del quote (aceptar/rechazar)
CREATE POLICY "quotes_update_client_decision"
  ON quotes FOR UPDATE USING (
    lead_id IN (SELECT id FROM leads WHERE client_id = auth.uid())
    AND status = 'visto' -- Solo puede aceptar/rechazar si ya lo vio
  );

-- =====================================================
-- TABLA: projects
-- =====================================================
CREATE POLICY "projects_select_participants"
  ON projects FOR SELECT USING (
    client_id = auth.uid()
    OR professional_id = auth_professional_id()
  );

-- Los proyectos se crean por trigger al aceptar un quote — no directamente desde el cliente
-- Si necesitas permitirlo desde la app, añadir esta política:
CREATE POLICY "projects_insert_client"
  ON projects FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "projects_update_participants"
  ON projects FOR UPDATE USING (
    client_id = auth.uid()
    OR professional_id = auth_professional_id()
  );

-- =====================================================
-- TABLA: payments
-- =====================================================
CREATE POLICY "payments_select_participants"
  ON payments FOR SELECT USING (
    client_id = auth.uid()
    OR professional_id = auth_professional_id()
  );

-- Solo se insertan desde Edge Functions (service role), no directamente desde el cliente
-- Si necesitas que el cliente registre la intención de pago:
CREATE POLICY "payments_insert_client"
  ON payments FOR INSERT WITH CHECK (client_id = auth.uid());

-- Updates solo via Edge Functions (webhook Stripe) — bloquear desde el cliente
-- No definir UPDATE policy para payments = solo service role puede actualizarlos

-- =====================================================
-- TABLA: reviews
-- =====================================================
-- Las reviews son públicas (cualquiera puede ver la reputación del profesional)
CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT USING (TRUE);

-- Solo el cliente del proyecto puede escribir la review, y solo si está completado
CREATE POLICY "reviews_insert_verified"
  ON reviews FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_id = auth.uid()
        AND p.status = 'completado'
        AND p.payment_status = 'completado'
    )
  );

-- No se pueden editar reviews una vez publicadas
-- (no añadir UPDATE policy)

-- =====================================================
-- TABLA: messages
-- =====================================================
CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_recipient_read"
  ON messages FOR UPDATE USING (
    recipient_id = auth.uid() -- Solo el destinatario puede marcar como leído
  );

-- =====================================================
-- TABLA: commissions
-- =====================================================
-- Solo admins y profesionales del proyecto ven comisiones
CREATE POLICY "commissions_select"
  ON commissions FOR SELECT USING (
    auth_user_type() = 'admin'
    OR project_id IN (
      SELECT id FROM projects WHERE professional_id = auth_professional_id()
    )
  );

-- Solo service role puede insertar/actualizar comisiones (via trigger/Edge Function)
-- No definir INSERT/UPDATE policies = solo service role

-- =====================================================
-- TABLA: verification_documents
-- =====================================================
CREATE POLICY "verification_documents_select_own"
  ON verification_documents FOR SELECT USING (
    professional_id = auth_professional_id()
    OR auth_user_type() = 'admin'
  );

CREATE POLICY "verification_documents_insert_own"
  ON verification_documents FOR INSERT WITH CHECK (
    professional_id = auth_professional_id()
  );

-- =====================================================
-- TABLA: favorites
-- =====================================================
CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "favorites_manage_own"
  ON favorites FOR ALL USING (client_id = auth.uid());

-- =====================================================
-- TABLA: notifications
-- =====================================================
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Inserts solo via triggers (service role) — no policy INSERT
```

---

## 💬 FASE 3 — MEJORAR LA ARQUITECTURA DE MENSAJERÍA

**Problema actual:** `messages.project_id NOT NULL` bloquea comunicación antes de tener un proyecto. Un cliente necesita poder contactar al profesional antes de aceptar su quote.

Crear tabla de conversaciones genérica:

```sql
-- Nueva tabla: conversations (reemplaza el acoplamiento con project_id)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Una conversación pertenece a un lead O a un proyecto (no ambos a la vez)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES users(id),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id),
  last_message_at TIMESTAMP,
  client_unread_count INT DEFAULT 0,
  professional_unread_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Garantizar unicidad: una sola conversación por (lead O proyecto) + par de usuarios
  CONSTRAINT conversation_context CHECK (
    (lead_id IS NOT NULL AND project_id IS NULL) OR
    (lead_id IS NULL AND project_id IS NOT NULL)
  )
);

-- Migrar messages para usar conversation_id
ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id);
-- Mantener project_id como nullable para backwards compat durante migración
ALTER TABLE messages ALTER COLUMN project_id DROP NOT NULL;

-- RLS para conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT USING (
    client_id = auth.uid()
    OR professional_id = auth_professional_id()
  );

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT WITH CHECK (
    client_id = auth.uid() OR professional_id = auth_professional_id()
  );
```

---

## 📱 FASE 4 — INICIALIZAR LA APP REACT NATIVE

```bash
cd habitup/
npx create-expo-app . --template expo-template-blank-typescript
# O si ya está inicializado, solo instalar dependencias:
npx expo install expo-router expo-linking expo-constants expo-status-bar
npm install @supabase/supabase-js zustand react-hook-form @hookform/resolvers zod
npm install nativewind tailwindcss
npm install @stripe/stripe-react-native
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-safe-area-context react-native-screens
```

### 4.1 Configurar el cliente Supabase

**Archivo:** `src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Adaptador de almacenamiento seguro para tokens de auth en mobile
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante en React Native
  },
});
```

### 4.2 Generar tipos TypeScript de Supabase

```bash
# Después de aplicar las migraciones al proyecto Supabase:
npx supabase gen types typescript \
  --project-id TU_PROJECT_ID \
  --schema public \
  > src/types/database.types.ts
```

**CRÍTICO:** Todos los services y hooks deben usar `Database['public']['Tables']` para tipar las queries. Nunca usar `any`.

### 4.3 AuthStore con Zustand

**Archivo:** `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type User = Database['public']['Tables']['users']['Row'];

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, session: null, isLoading: false });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      set({ session, user: profile, isInitialized: true });
    } else {
      set({ session: null, user: null, isInitialized: true });
    }

    // Escuchar cambios de sesión en tiempo real
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ session, user: profile });
      } else if (event === 'SIGNED_OUT') {
        set({ session: null, user: null });
      }
    });
  },
}));
```

---

## 🔧 FASE 5 — SERVICIOS (CAPA DE DATOS)

**Regla fundamental:** TODA llamada a Supabase va en `src/services/`. Los componentes nunca importan `supabase` directamente. Los hooks llaman a services, los componentes llaman a hooks.

### 5.1 Patrón de service

Cada service sigue este patrón de manejo de errores:

```typescript
// src/services/leads.service.ts
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadRow = Database['public']['Tables']['leads']['Row'];

export const leadsService = {
  async getActiveLeads(categoryId?: string, page = 0, limit = 20) {
    let query = supabase
      .from('leads')
      .select(`
        *,
        category:categories(name, slug, icon_url),
        client:users(full_name, avatar_url)
      `)
      .eq('status', 'activo')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Error fetching leads: ${error.message}`);
    return { data, count };
  },

  async createLead(payload: LeadInsert) {
    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Error creating lead: ${error.message}`);
    return data;
  },

  async incrementView(leadId: string) {
    // Usar RPC para evitar race condition en views_count
    const { error } = await supabase.rpc('increment_lead_views', { lead_id: leadId });
    if (error) console.error('Error incrementing view:', error);
  },
};
```

**Crear el mismo patrón para:**
- `auth.service.ts` — login, register, resetPassword, updateProfile
- `professionals.service.ts` — search, getById, getNearby, updateProfile
- `quotes.service.ts` — getByLead, create, accept, reject
- `projects.service.ts` — getAll, getById, updateStatus, complete
- `payments.service.ts` — createPaymentIntent (llama a Edge Function), getHistory
- `reviews.service.ts` — create, getByProfessional
- `messages.service.ts` — getByConversation, send, markAsRead, subscribeRealtime
- `categories.service.ts` — getAll (con caché)
- `notifications.service.ts` — getAll, markAsRead, markAllAsRead

### 5.2 Añadir función RPC para views_count sin race condition

```sql
-- En Supabase SQL Editor:
CREATE OR REPLACE FUNCTION increment_lead_views(lead_id UUID)
RETURNS VOID AS $$
  UPDATE leads SET views_count = views_count + 1 WHERE id = lead_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_portfolio_views(item_id UUID)
RETURNS VOID AS $$
  UPDATE portfolio_items SET views_count = views_count + 1 WHERE id = item_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## ⚡ FASE 6 — EDGE FUNCTIONS (STRIPE)

### 6.1 create-payment-intent

**Archivo:** `supabase/functions/create-payment-intent/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    const { projectId } = await req.json();
    
    // Verificar autorización con Supabase Auth
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Obtener proyecto y verificar que el cliente es el correcto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, professional:professional_profiles(*, user:users(*))')
      .eq('id', projectId)
      .eq('client_id', user.id) // RLS + verificación explícita
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }

    // Verificar que el profesional tiene una cuenta Stripe Connect
    if (!project.professional.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Professional has no payment account' }),
        { status: 400 }
      );
    }

    // Crear PaymentIntent con Stripe Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(project.agreed_price * 100), // Stripe usa centavos
      currency: 'eur',
      application_fee_amount: Math.round(project.platform_commission_amount * 100),
      transfer_data: {
        destination: project.professional.stripe_account_id,
      },
      metadata: {
        project_id: projectId,
        client_id: user.id,
        professional_id: project.professional_id,
      },
    });

    // Registrar el intento de pago en la BD
    await supabase.from('payments').insert({
      project_id: projectId,
      client_id: user.id,
      professional_id: project.professional_id,
      amount: project.agreed_price,
      gross_amount: project.agreed_price,
      commission_amount: project.platform_commission_amount,
      professional_amount: project.professional_receives,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pendiente',
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 6.2 stripe-webhook

**Archivo:** `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Admin client para updates que bypass RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await supabase
      .from('payments')
      .update({
        status: 'completado',
        paid_at: new Date().toISOString(),
        stripe_transfer_id: paymentIntent.transfer_data?.destination as string,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    await supabase
      .from('payments')
      .update({ status: 'fallido' })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 🏗️ FASE 7 — PANTALLAS PRINCIPALES

Implementa las pantallas en este orden de prioridad (MVP primero):

### Prioridad 1 — Auth (bloqueante)
1. `(auth)/login.tsx` — email/password + Google OAuth
2. `(auth)/register.tsx` — con selección de rol (cliente/profesional) + campos específicos según rol
3. `(auth)/forgot-password.tsx`

### Prioridad 2 — Flujo cliente (core del producto)
4. `(client)/home.tsx` — feed de categorías + profesionales recomendados + leads recientes
5. `(client)/search.tsx` — búsqueda por categoría + ciudad + radio + filtros (rating, precio)
6. `(client)/leads/create.tsx` — formulario de lead con foto upload + geolocalización
7. `(client)/leads/[id].tsx` — detalle del lead + lista de quotes recibidos
8. `(client)/projects/[id].tsx` — detalle del proyecto + estado + botón de pago

### Prioridad 3 — Flujo profesional (core del producto)
9. `(professional)/home.tsx` — dashboard con leads nuevos + proyectos activos + stats
10. `(professional)/leads/available.tsx` — feed de leads activos en su categoría/zona
11. `(professional)/leads/[id].tsx` — detalle del lead + formulario para enviar quote
12. `(professional)/projects/[id].tsx` — detalle del proyecto + cambio de estado

### Prioridad 4 — Chat y notificaciones
13. `chat/[projectId].tsx` — chat en tiempo real con Supabase Realtime
14. Integración de push notifications (OneSignal)

### Prioridad 5 — Perfiles y portfolio
15. `(professional)/profile.tsx` — edición de perfil + portfolio
16. `(client)/profile.tsx` — perfil del cliente + historial

---

## 🎨 FASE 8 — SISTEMA DE DISEÑO

Paleta y tokens de diseño de HabitUp:

```typescript
// src/utils/colors.ts
export const colors = {
  // Primario — Electric Blue profundo
  primary: {
    50:  '#EEF2FF',
    100: '#C7D4FD',
    200: '#9FB6FB',
    400: '#5A7BF7',
    600: '#2952EF',
    800: '#1730B2',
    900: '#0D1E78',
  },
  // Acento — Coral CTA (botones principales)
  coral: {
    50:  '#FFF0ED',
    100: '#FFD2C9',
    400: '#FF6B4A',
    600: '#E64020',
    800: '#9A2510',
  },
  // Neutral
  gray: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#4B5563',
    800: '#1F2937',
    900: '#111827',
  },
  // Semánticos
  success: '#10B981',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const borderRadius = {
  sm:  6,
  md:  10,
  lg:  16,
  xl:  24,
  full: 9999,
};
```

### Componentes UI que debes crear en `src/components/ui/`:

```
Button.tsx          — Variantes: primary (coral), secondary (outline), ghost, danger
Input.tsx           — Con label, error message, iconos, estados
Card.tsx            — Variante elevada y flat
Badge.tsx           — Estados de leads/proyectos/quotes con colores semánticos
Avatar.tsx          — Con fallback de iniciales, verified badge
RatingStars.tsx     — Input y display mode
LoadingSpinner.tsx  — Con mensaje
EmptyState.tsx      — Ilustración + título + CTA
BottomSheet.tsx     — Modal desde abajo (para filtros, confirmaciones)
PriceTag.tsx        — Formateo de precio con €
```

---

## ✅ FASE 9 — CALIDAD Y TESTING

### 9.1 Tipos estrictos (zero tolerancia a `any`)
- Siempre usar `Database['public']['Tables']['nombre_tabla']['Row']` para tipar queries
- Usar `Database['public']['Tables']['nombre_tabla']['Insert']` para inserts
- Usar `Database['public']['Tables']['nombre_tabla']['Update']` para updates

### 9.2 Tests unitarios para services y utils

```typescript
// Ejemplo: src/services/__tests__/leads.service.test.ts
import { leadsService } from '../leads.service';
// Mock Supabase
jest.mock('../../config/supabase');

describe('leadsService', () => {
  it('should throw when category not found', async () => {
    // ...
  });
});
```

### 9.3 Validaciones Zod para todos los formularios

```typescript
// src/utils/validators.ts
import { z } from 'zod';

export const createLeadSchema = z.object({
  title: z.string().min(10, 'Mínimo 10 caracteres').max(255),
  description: z.string().min(30, 'Describe el trabajo con más detalle').max(2000),
  category_id: z.string().uuid('Selecciona una categoría'),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  urgency: z.enum(['baja', 'media', 'alta']),
  location_city: z.string().min(2, 'Indica la ciudad'),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: 'El presupuesto mínimo no puede ser mayor al máximo', path: ['budget_max'] }
);

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  full_name: z.string().min(3, 'Nombre demasiado corto').max(100),
  user_type: z.enum(['cliente', 'professional']),
  phone: z.string().regex(/^[6-9]\d{8}$/, 'Teléfono español inválido').optional(),
});
```

---

## 🔍 FASE 10 — MEJORAS ADICIONALES (POST-MVP)

Una vez el MVP esté funcionando, implementar en este orden:

### 10.1 Vistas materializadas para rendimiento
```sql
CREATE MATERIALIZED VIEW professionals_with_categories_mv AS
-- (mismo contenido que la vista actual)
;
CREATE UNIQUE INDEX ON professionals_with_categories_mv(id);

-- Job para refrescar cada hora (via pg_cron o Edge Function en cron)
SELECT cron.schedule('refresh-professionals-mv', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY professionals_with_categories_mv;'
);
```

### 10.2 Añadir columna stripe_account_id al profesional
```sql
-- Nueva migración:
ALTER TABLE professional_profiles ADD COLUMN stripe_account_id VARCHAR(255);
CREATE INDEX idx_professional_profiles_stripe ON professional_profiles(stripe_account_id);
```

### 10.3 Rate limiting en Edge Functions
```typescript
// Añadir Redis/Upstash para rate limiting en create-payment-intent
// Evitar que un cliente spamee creaciones de PaymentIntent
```

### 10.4 Búsqueda full-text en leads
```sql
ALTER TABLE leads ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(description,''))
  ) STORED;

CREATE INDEX leads_search_idx ON leads USING GIN(search_vector);

-- Función RPC para búsqueda desde la app:
CREATE FUNCTION search_leads(query_text TEXT)
RETURNS SETOF leads AS $$
  SELECT * FROM leads
  WHERE search_vector @@ plainto_tsquery('spanish', query_text)
  ORDER BY ts_rank(search_vector, plainto_tsquery('spanish', query_text)) DESC;
$$ LANGUAGE sql STABLE;
```

### 10.5 Sistema de disputa/resolución
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  raised_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) CHECK (status IN ('abierta', 'en_revision', 'resuelta', 'cerrada')),
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📦 ENTREGABLES FINALES ESPERADOS

Al completar todas las fases, el repo debe tener:

```
✅ /CLAUDE.md — contexto del proyecto actualizado
✅ /supabase/schema/habitup_schema.sql — schema corregido (sin bugs)
✅ /supabase/migrations/ — todas las migraciones versionadas
✅ /supabase/functions/create-payment-intent/index.ts
✅ /supabase/functions/stripe-webhook/index.ts
✅ /habitup/src/config/supabase.ts
✅ /habitup/src/types/database.types.ts — generado por Supabase CLI
✅ /habitup/src/stores/authStore.ts
✅ /habitup/src/stores/notificationStore.ts
✅ /habitup/src/services/*.service.ts — todos los servicios
✅ /habitup/src/hooks/*.ts — hooks para cada entidad
✅ /habitup/src/utils/validators.ts — schemas Zod
✅ /habitup/src/utils/colors.ts — sistema de diseño
✅ /habitup/src/components/ui/*.tsx — componentes base
✅ /habitup/app/(auth)/*.tsx — pantallas de auth
✅ /habitup/app/(client)/**/*.tsx — pantallas de cliente
✅ /habitup/app/(professional)/**/*.tsx — pantallas de profesional
✅ /habitup/app/chat/[projectId].tsx — chat en tiempo real
✅ /habitup/.env.example — variables necesarias documentadas
✅ /habitup/app.json — configurado correctamente para Expo
```

---

## ⛔ REGLAS QUE NUNCA DEBES ROMPER

1. **Nunca usar `any` en TypeScript** — si no sabes el tipo, busca en `database.types.ts`
2. **Nunca importar `supabase` en un componente** — siempre a través de `services/`
3. **Nunca añadir `.eq('user_id', uid)` manualmente** a menos que sea imprescindible — RLS ya filtra
4. **Nunca hacer read-modify-write** en contadores — usar siempre `campo = campo + 1` vía SQL
5. **Nunca commitear `.env.local`** — está en `.gitignore`
6. **Nunca modificar una migración ya aplicada** — crear siempre una nueva
7. **Nunca llamar a Stripe directamente desde la app** — siempre vía Edge Function
8. **Nunca usar estilos inline en JSX** — NativeWind classes o StyleSheet
9. **Nunca dejar `console.log` en producción** — usar el logger de utils
10. **Siempre manejar el `error` que devuelve Supabase** — nunca ignorarlo

---

*Prompt generado el 28/05/2026 — Versión 2.0 (post-análisis de ingeniería)*
*Bugs corregidos: 5 críticos, 7 warnings | Mejoras añadidas: 10*
