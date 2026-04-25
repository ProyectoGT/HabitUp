-- =====================================================
-- REFORMA360 - Esquema PostgreSQL para Supabase
-- Marketplace de Profesionales de Reformas
-- =====================================================

-- 1. TABLA DE USUARIOS (roles: cliente o profesional)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('cliente', 'professional', 'admin')),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP,
  deleted_at TIMESTAMP -- soft delete
);

-- Índice para búsquedas de email y tipo de usuario
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_is_verified ON users(is_verified);

-- 2. TABLA DE PERFILES DE PROFESIONALES
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  company_type VARCHAR(50) CHECK (company_type IN ('autonomo', 'empresa')), -- Autónomo o Empresa
  nif_cif VARCHAR(20) UNIQUE, -- Para verificación (DNI/CIF)
  nif_cif_verified BOOLEAN DEFAULT FALSE,
  nif_cif_verified_at TIMESTAMP,
  description TEXT,
  experience_years INT,
  avg_rating DECIMAL(3, 2) DEFAULT 0, -- 0.00 a 5.00
  total_reviews INT DEFAULT 0,
  total_projects_completed INT DEFAULT 0,
  response_time_hours INT, -- Tiempo promedio de respuesta
  
  -- Localización
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_country VARCHAR(100) DEFAULT 'España',
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  service_radius_km INT DEFAULT 50, -- Radio de servicio
  
  -- Verificación de datos
  documents_verified BOOLEAN DEFAULT FALSE,
  bank_account_verified BOOLEAN DEFAULT FALSE,
  
  -- Redes sociales y web
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  linkedin_url TEXT,
  
  -- Configuración
  is_active BOOLEAN DEFAULT TRUE,
  accepts_new_leads BOOLEAN DEFAULT TRUE,
  hourly_rate DECIMAL(10, 2), -- Tarifa por hora (si aplica)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_is_active ON professional_profiles(is_active);
CREATE INDEX idx_professional_profiles_location ON professional_profiles(location_city, location_region);
CREATE INDEX idx_professional_profiles_rating ON professional_profiles(avg_rating DESC);
-- Índice geoespacial (requiere PostGIS)
CREATE INDEX idx_professional_profiles_geom ON professional_profiles 
USING GIST (ll_to_earth(location_latitude, location_longitude));

-- 3. TABLA DE CATEGORÍAS (especialidades)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL, -- Fontanería, Electricidad, Carpintería, etc.
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorías predefinidas
INSERT INTO categories (name, slug, description) VALUES
  ('Fontanería', 'fontaneria', 'Trabajos de tuberías, grifos, desagües'),
  ('Electricidad', 'electricidad', 'Instalaciones eléctricas, reformas eléctricas'),
  ('Carpintería', 'carpinteria', 'Trabajos de madera, muebles, puertas'),
  ('Pintura', 'pintura', 'Pintura interior y exterior'),
  ('Albañilería', 'albanileria', 'Trabajos de construcción, muros, suelos'),
  ('Climatización', 'climatizacion', 'Aire acondicionado, calefacción'),
  ('Techumbre', 'techumbre', 'Trabajos en tejados y cubiertas'),
  ('Cristalería', 'cristaleria', 'Cristales, espejos, mamparas'),
  ('Cerrajería', 'cerrajeria', 'Cerraduras, puertas de seguridad'),
  ('Jardinería', 'jardineria', 'Mantenimiento de jardines, paisajismo');

-- 4. TABLA DE ASOCIACIÓN: profesionales y sus categorías
CREATE TABLE professional_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  years_in_category INT,
  is_primary BOOLEAN DEFAULT FALSE, -- Especialidad principal
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professional_id, category_id)
);

CREATE INDEX idx_professional_categories_professional_id ON professional_categories(professional_id);
CREATE INDEX idx_professional_categories_category_id ON professional_categories(category_id);

-- 5. TABLA DE PORTFOLIO (trabajos realizados)
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  additional_photos JSONB, -- Array de URLs
  completion_date DATE,
  client_name VARCHAR(255),
  client_location VARCHAR(255),
  is_featured BOOLEAN DEFAULT FALSE,
  views_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_items_professional_id ON portfolio_items(professional_id);
CREATE INDEX idx_portfolio_items_is_featured ON portfolio_items(is_featured);

-- 6. TABLA DE LEADS (solicitudes de presupuesto del cliente)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  location_city VARCHAR(100),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  preferred_start_date DATE,
  urgency VARCHAR(50) CHECK (urgency IN ('baja', 'media', 'alta')) DEFAULT 'media',
  photos JSONB, -- URLs de fotos del lugar
  
  -- Estado del lead
  status VARCHAR(50) CHECK (status IN ('activo', 'en_negociacion', 'asignado', 'cerrado', 'cancelado')) DEFAULT 'activo',
  assigned_professional_id UUID REFERENCES professional_profiles(id),
  
  -- Control
  is_featured BOOLEAN DEFAULT FALSE, -- Lead destacado (pago)
  featured_until TIMESTAMP,
  views_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_category_id ON leads(category_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_professional_id ON leads(assigned_professional_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_location ON leads(location_city);

-- 7. TABLA DE PRESUPUESTOS (respuestas del profesional a un lead)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  delivery_days INT, -- Días estimados para completar
  includes_materials BOOLEAN DEFAULT TRUE,
  payment_terms VARCHAR(255), -- Condiciones de pago
  
  -- Estado del presupuesto
  status VARCHAR(50) CHECK (status IN ('enviado', 'visto', 'aceptado', 'rechazado', 'expirado')) DEFAULT 'enviado',
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Control
  viewed_at TIMESTAMP,
  expires_at TIMESTAMP, -- Presupuesto válido hasta...
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX idx_quotes_professional_id ON quotes(professional_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- 8. TABLA DE PROYECTOS (contrato cerrado entre cliente y profesional)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  agreed_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Fechas
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  
  -- Estado del proyecto
  status VARCHAR(50) CHECK (status IN ('pendiente', 'en_curso', 'pausado', 'completado', 'cancelado')) DEFAULT 'pendiente',
  
  -- Comisión y pagos
  platform_commission_percentage DECIMAL(5, 2) DEFAULT 10.00, -- % de comisión (10%)
  platform_commission_amount DECIMAL(10, 2) GENERATED ALWAYS AS (agreed_price * platform_commission_percentage / 100) STORED,
  professional_receives DECIMAL(10, 2) GENERATED ALWAYS AS (agreed_price - (agreed_price * platform_commission_percentage / 100)) STORED,
  payment_status VARCHAR(50) CHECK (payment_status IN ('pendiente', 'en_proceso', 'completado', 'fallido')) DEFAULT 'pendiente',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_professional_id ON projects(professional_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_payment_status ON projects(payment_status);

-- 9. TABLA DE PAGOS Y TRANSACCIONES
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Desglose
  gross_amount DECIMAL(10, 2), -- Cantidad que paga el cliente
  commission_amount DECIMAL(10, 2), -- Lo que se queda la plataforma
  professional_amount DECIMAL(10, 2), -- Lo que recibe el profesional
  
  -- Stripe
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_transfer_id VARCHAR(255), -- Transfer a cuenta del profesional
  
  -- Estado
  status VARCHAR(50) CHECK (status IN ('pendiente', 'procesando', 'completado', 'fallido', 'reembolsado')) DEFAULT 'pendiente',
  
  payment_method VARCHAR(50), -- card, bank_transfer, etc.
  paid_at TIMESTAMP,
  transferred_to_professional_at TIMESTAMP,
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_professional_id ON payments(professional_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- 10. TABLA DE RESEÑAS Y VALORACIONES
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- El cliente
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Aspectos específicos
  rating_quality INT CHECK (rating_quality BETWEEN 1 AND 5), -- Calidad del trabajo
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5), -- Comunicación
  rating_timeline INT CHECK (rating_timeline BETWEEN 1 AND 5), -- Cumplimiento de plazos
  rating_value INT CHECK (rating_value BETWEEN 1 AND 5), -- Relación precio-calidad
  
  -- Fotos de la reseña
  photos JSONB, -- URLs de fotos finales
  
  -- Control
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_professional_id ON reviews(professional_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_project_id ON reviews(project_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- 11. TABLA DE MENSAJES (chat entre cliente y profesional)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  message_type VARCHAR(50) CHECK (message_type IN ('text', 'image', 'file', 'quote_notification')) DEFAULT 'text',
  content TEXT,
  attachment_url TEXT, -- Si message_type es image o file
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- 12. TABLA DE COMISIONES (registro de comisiones generadas)
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL, -- 10%, 15%, etc.
  
  status VARCHAR(50) CHECK (status IN ('pendiente', 'transferencia_iniciada', 'completada', 'fallida')) DEFAULT 'pendiente',
  
  -- Control bancario
  stripe_transfer_id VARCHAR(255),
  transferred_at TIMESTAMP,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commissions_project_id ON commissions(project_id);
CREATE INDEX idx_commissions_status ON commissions(status);

-- 13. TABLA DE DOCUMENTOS DE VERIFICACIÓN
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50) CHECK (document_type IN ('dni_cif', 'company_registration', 'insurance', 'other')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  
  -- Validación
  status VARCHAR(50) CHECK (status IN ('pendiente', 'verificado', 'rechazado')) DEFAULT 'pendiente',
  verified_by UUID REFERENCES users(id), -- Admin que verifica
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_documents_professional_id ON verification_documents(professional_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);

-- 14. TABLA DE FAVORITOS/GUARDADOS (clientes guardando profesionales)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, professional_id)
);

CREATE INDEX idx_favorites_client_id ON favorites(client_id);
CREATE INDEX idx_favorites_professional_id ON favorites(professional_id);

-- 15. TABLA DE NOTIFICACIONES
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(100) NOT NULL, -- 'new_quote', 'project_started', 'review_received', etc.
  title VARCHAR(255),
  message TEXT,
  related_id UUID, -- ID del proyecto, quote, review, etc.
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Políticas de seguridad
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios pueden ver su propio perfil y todos los perfiles de profesionales
CREATE POLICY "Users can view own profile and all professional profiles"
ON users FOR SELECT
USING (
  auth.uid() = id 
  OR user_type = 'professional'
);

-- Política: los profesionales pueden ver sus propios leads y proyectos
CREATE POLICY "Professionals can see their own leads and projects"
ON leads FOR SELECT
USING (
  assigned_professional_id = (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
  OR client_id = auth.uid()
);

-- Política: los usuarios pueden crear sus propios leads
CREATE POLICY "Clients can create their own leads"
ON leads FOR INSERT
WITH CHECK (
  client_id = auth.uid()
);

-- Política: cada usuario solo ve sus propios mensajes
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (
  sender_id = auth.uid() 
  OR recipient_id = auth.uid()
);

-- Política: solo el profesional y el cliente pueden ver su proyecto
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (
  client_id = auth.uid()
  OR professional_id = (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
);

-- Política: solo el usuario puede ver sus notificaciones
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (
  user_id = auth.uid()
);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función: actualizar rating promedio del profesional cuando se añade una reseña
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professional_profiles
  SET 
    avg_rating = (
      SELECT COALESCE(AVG(rating), 0) FROM reviews 
      WHERE professional_id = NEW.professional_id
    ),
    total_reviews = (
      SELECT COUNT(*) FROM reviews 
      WHERE professional_id = NEW.professional_id
    )
  WHERE id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_professional_rating_trigger
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_professional_rating();

-- Función: marcar un proyecto como completado después de recibir el pago
CREATE OR REPLACE FUNCTION mark_project_as_completed_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completado' THEN
    UPDATE projects
    SET status = 'completado'
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_project_completed_trigger
AFTER UPDATE ON payments
FOR EACH ROW
WHEN (NEW.status = 'completado')
EXECUTE FUNCTION mark_project_as_completed_after_payment();

-- Función: registrar comisión cuando se completa el pago
CREATE OR REPLACE FUNCTION create_commission_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status != 'completado' THEN
    INSERT INTO commissions (payment_id, project_id, amount, percentage, status)
    SELECT 
      NEW.id,
      NEW.project_id,
      NEW.commission_amount,
      (SELECT platform_commission_percentage FROM projects WHERE id = NEW.project_id),
      'pendiente'
    WHERE NOT EXISTS (
      SELECT 1 FROM commissions WHERE payment_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_commission_trigger
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION create_commission_on_payment();

-- Función: enviar notificación cuando se recibe un presupuesto
CREATE OR REPLACE FUNCTION notify_client_on_quote()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, related_id, created_at)
  SELECT 
    l.client_id,
    'new_quote',
    'Nuevo presupuesto recibido',
    CONCAT((SELECT full_name FROM users WHERE id = (SELECT user_id FROM professional_profiles WHERE id = NEW.professional_id)), ' ha enviado un presupuesto'),
    NEW.id,
    CURRENT_TIMESTAMP
  FROM leads l
  WHERE l.id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_quote_trigger
AFTER INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION notify_client_on_quote();

-- Función: marcar como visto cuando el cliente lee un presupuesto
CREATE OR REPLACE FUNCTION mark_quote_as_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('visto', 'aceptado', 'rechazado') THEN
    NEW.viewed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_quote_viewed_trigger
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION mark_quote_as_viewed();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista: profesionales con sus categorías y rating
CREATE VIEW professionals_with_categories AS
SELECT 
  pp.id,
  pp.user_id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  pp.company_name,
  pp.company_type,
  pp.description,
  pp.experience_years,
  pp.avg_rating,
  pp.total_reviews,
  pp.total_projects_completed,
  pp.location_city,
  pp.location_region,
  pp.service_radius_km,
  pp.is_active,
  pp.accepts_new_leads,
  pp.website_url,
  pp.instagram_url,
  STRING_AGG(c.name, ', ') AS categories
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN professional_categories pc ON pp.id = pc.professional_id
LEFT JOIN categories c ON pc.category_id = c.id
GROUP BY pp.id, u.id;

-- Vista: resumen de proyectos por profesional
CREATE VIEW professional_project_summary AS
SELECT 
  pp.id,
  pp.user_id,
  u.full_name,
  COUNT(p.id) AS total_projects,
  SUM(CASE WHEN p.status = 'completado' THEN 1 ELSE 0 END) AS completed_projects,
  SUM(CASE WHEN p.status = 'en_curso' THEN 1 ELSE 0 END) AS active_projects,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(r.id) AS total_reviews
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN projects p ON pp.id = p.professional_id
LEFT JOIN reviews r ON pp.id = r.professional_id
GROUP BY pp.id, u.id;

-- =====================================================
-- INSERTS DE EJEMPLO (comentados)
-- =====================================================

/*
-- Insertar un usuario cliente
INSERT INTO users (email, full_name, phone, user_type) 
VALUES ('cliente@example.com', 'Juan García López', '685123456', 'cliente');

-- Insertar un usuario profesional
INSERT INTO users (email, full_name, phone, user_type) 
VALUES ('fontanero@example.com', 'Carlos Martínez', '687654321', 'professional');

-- Insertar perfil del profesional
INSERT INTO professional_profiles (user_id, company_name, company_type, description, experience_years, location_city, location_region, location_latitude, location_longitude)
SELECT id, 'Carlos Plomería', 'autonomo', 'Especialista en reformas de baños y cocinas', 15, 'Barcelona', 'Cataluña', 41.3851, 2.1734
FROM users WHERE email = 'fontanero@example.com';

-- Asignar categoría al profesional
INSERT INTO professional_categories (professional_id, category_id, years_in_category, is_primary)
SELECT pp.id, c.id, 15, TRUE
FROM professional_profiles pp
JOIN users u ON pp.user_id = u.id
JOIN categories c ON c.slug = 'fontaneria'
WHERE u.email = 'fontanero@example.com';
*/

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================
