import { z } from 'zod';

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(2, 'Introduce tu nombre').max(60),
    last_name: z.string().trim().min(2, 'Introduce tus apellidos').max(80),
    email: z.string().trim().toLowerCase().email('Introduce un correo válido'),
    phone: z.string().trim().regex(/^(?:\+34)?[6-9]\d{8}$/, 'Introduce un teléfono español válido'),
    locality: z.string().trim().min(2, 'Introduce tu localidad').max(100),
    postal_code: z.string().trim().regex(/^\d{5}$/, 'Introduce un código postal de 5 cifras'),
    password: z
      .string()
      .min(8, 'Usa al menos 8 caracteres')
      .regex(/[a-z]/, 'Añade una letra minúscula')
      .regex(/[A-Z]/, 'Añade una letra mayúscula')
      .regex(/[0-9]/, 'Añade un número'),
    confirm_password: z.string(),
    user_type: z.enum(['cliente', 'professional']),
    accepted_terms: z.boolean().refine(Boolean, 'Debes aceptar los términos y la política de privacidad'),
    marketing_consent: z.boolean(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Introduce un correo válido'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

export const createLeadSchema = z
  .object({
    title: z.string().min(10, 'Mínimo 10 caracteres').max(255),
    description: z.string().min(30, 'Describe el trabajo con más detalle').max(2000),
    category_id: z.string().uuid('Selecciona una categoría'),
    budget_min: z.number().min(0).optional(),
    budget_max: z.number().min(0).optional(),
    urgency: z.enum(['baja', 'media', 'alta']),
    location_city: z.string().min(2, 'Indica la ciudad'),
    preferred_start_date: z.string().optional(),
  })
  .refine(
    (d) => !d.budget_min || !d.budget_max || d.budget_min <= d.budget_max,
    { message: 'El presupuesto mínimo no puede ser mayor al máximo', path: ['budget_max'] }
  );

export const createQuoteSchema = z.object({
  amount: z.number().min(1, 'El importe debe ser mayor a 0'),
  description: z.string().min(20, 'Describe tu propuesta con más detalle').max(2000),
  delivery_days: z.number().int().min(1).optional(),
  warranty_months: z.number().int().min(0).optional(),
  includes_materials: z.boolean().default(false),
  currency: z.string().default('EUR'),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Selecciona una valoración').max(5),
  comment: z.string().min(10, 'Escribe al menos 10 caracteres').max(2000),
  quality_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  punctuality_rating: z.number().int().min(1).max(5).optional(),
});

export const editProfileSchema = z.object({
  full_name: z.string().min(3, 'Nombre demasiado corto').max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{8}$/, 'Teléfono español inválido')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export const editProfessionalProfileSchema = z.object({
  company_name: z.string().min(2, 'Nombre demasiado corto').max(200).optional(),
  company_type: z.enum(['autonomo', 'empresa']).optional(),
  description: z.string().min(20, 'Describe tu empresa con más detalle').max(2000).optional(),
  experience_years: z.number().int().min(0).max(99).optional(),
  location_city: z.string().min(2, 'Indica la ciudad').optional(),
  location_region: z.string().optional(),
  service_radius_km: z.number().int().min(0).max(500).optional(),
  hourly_rate: z.number().min(0).optional(),
  website_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram_url: z.string().url('URL inválida').optional().or(z.literal('')),
  facebook_url: z.string().url('URL inválida').optional().or(z.literal('')),
  linkedin_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateLeadFormData = z.infer<typeof createLeadSchema>;
export type CreateQuoteFormData = z.infer<typeof createQuoteSchema>;
export type CreateReviewFormData = z.infer<typeof createReviewSchema>;
export type EditProfileFormData = z.infer<typeof editProfileSchema>;
export type EditProfessionalProfileFormData = z.infer<typeof editProfessionalProfileSchema>;
