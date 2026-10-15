import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YSpNfUs'

export const TEST_PASSWORD = 'TestRLS2024!'

export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY)
}

export interface TestUsers {
  clientA: { id: string; email: string }
  clientB: { id: string; email: string }
  professional: { id: string; email: string }
  outsider: { id: string; email: string }
}

export interface TestData {
  userIds: TestUsers
  categoryId: string
  professionalProfileId: string
  leadA1Id: string
  leadA2Id: string
  leadB1Id: string
  quoteId: string
  projectId: string
  conversationId: string
  messageId: string
}

function generateEmails(runId: number) {
  return {
    clientA: `rls-a-${runId}@habitup.test`,
    clientB: `rls-b-${runId}@habitup.test`,
    professional: `rls-pro-${runId}@habitup.test`,
    outsider: `rls-out-${runId}@habitup.test`,
  }
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  fullName: string,
  userType: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, user_type: userType },
  })
  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`)
  }
  if (!data?.user?.id) {
    throw new Error(`No user ID returned for ${email}`)
  }
  return data.user.id
}

async function deleteAuthUser(admin: SupabaseClient, id: string) {
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.warn(`  ⚠ Failed to delete user ${id}: ${error.message}`)
  }
}

async function ensureCategory(admin: SupabaseClient): Promise<string> {
  const { data } = await admin.from('categories').select('id').limit(1).maybeSingle()
  if (data?.id) return data.id

  const { data: inserted, error } = await admin
    .from('categories')
    .insert({ name: 'Test Reformas', slug: 'test-reformas', description: null, is_active: true })
    .select('id')
    .single()
  if (error || !inserted) throw new Error(`Failed to create test category: ${error?.message}`)
  return inserted.id
}

export async function setupTestData(admin: SupabaseClient, runId: number): Promise<TestData> {
  const emails = generateEmails(runId)

  const [clientAId, clientBId, proId, outsiderId] = await Promise.all([
    createAuthUser(admin, emails.clientA, 'Test Client A', 'cliente'),
    createAuthUser(admin, emails.clientB, 'Test Client B', 'cliente'),
    createAuthUser(admin, emails.professional, 'Test Professional', 'professional'),
    createAuthUser(admin, emails.outsider, 'Test Outsider', 'cliente'),
  ])

  const categoryId = await ensureCategory(admin)

  const { data: proProfile, error: proError } = await admin
    .from('professional_profiles')
    .insert({
      user_id: proId,
      company_name: 'Test Pro SL',
      description: 'Professional test profile',
      location_city: 'Madrid',
      location_region: 'Madrid',
      location_country: 'ES',
      service_radius_km: 50,
      is_active: true,
      accepts_new_leads: true,
    })
    .select('id')
    .single()
  if (proError || !proProfile) throw new Error(`Failed to create pro profile: ${proError?.message}`)

  const { data: leadA1, error: la1Err } = await admin
    .from('leads')
    .insert({
      client_id: clientAId,
      category_id: categoryId,
      title: 'Reforma cocina A1',
      description: 'Necesito reformar la cocina',
      location_city: 'Madrid',
      urgency: 'media',
      status: 'activo',
      photos: [],
    })
    .select('id')
    .single()
  if (la1Err) throw new Error(`Failed to create lead A1: ${la1Err.message}`)

  const { data: leadA2, error: la2Err } = await admin
    .from('leads')
    .insert({
      client_id: clientAId,
      category_id: categoryId,
      title: 'Pintar piso A2',
      description: 'Pintar salon y dormitorios',
      location_city: 'Barcelona',
      urgency: 'baja',
      status: 'cerrado',
      photos: [],
    })
    .select('id')
    .single()
  if (la2Err) throw new Error(`Failed to create lead A2: ${la2Err.message}`)

  const { data: leadB1, error: lb1Err } = await admin
    .from('leads')
    .insert({
      client_id: clientBId,
      category_id: categoryId,
      title: 'Fontaneria B1',
      description: 'Fuga de agua en el bano',
      location_city: 'Valencia',
      urgency: 'alta',
      status: 'activo',
      photos: [],
    })
    .select('id')
    .single()
  if (lb1Err) throw new Error(`Failed to create lead B1: ${lb1Err.message}`)

  const { data: quote, error: qErr } = await admin
    .from('quotes')
    .insert({
      lead_id: leadA1.id,
      professional_id: proProfile.id,
      amount: 1500,
      currency: 'EUR',
      description: 'Presupuesto reforma cocina',
      status: 'enviado',
    })
    .select('id')
    .single()
  if (qErr) throw new Error(`Failed to create quote: ${qErr.message}`)

  const { data: project, error: pErr } = await admin
    .from('projects')
    .insert({
      lead_id: leadA2.id,
      client_id: clientAId,
      professional_id: proProfile.id,
      category_id: categoryId,
      title: 'Proyecto pintura A2',
      description: 'Pintar piso completo',
      agreed_price: 800,
      status: 'en_curso',
    })
    .select('id')
    .single()
  if (pErr) throw new Error(`Failed to create project: ${pErr.message}`)

  const { data: conversation, error: conversationErr } = await admin
    .from('conversations')
    .select('id')
    .eq('project_id', project.id)
    .single()
  if (conversationErr || !conversation) {
    throw new Error(`Failed to resolve project conversation: ${conversationErr?.message}`)
  }

  const { data: msg, error: mErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      project_id: project.id,
      sender_id: proId,
      recipient_id: clientAId,
      content: 'Hola, empiezo la semana que viene',
      message_type: 'text',
    })
    .select('id')
    .single()
  if (mErr) throw new Error(`Failed to create message: ${mErr.message}`)

  return {
    userIds: {
      clientA: { id: clientAId, email: emails.clientA },
      clientB: { id: clientBId, email: emails.clientB },
      professional: { id: proId, email: emails.professional },
      outsider: { id: outsiderId, email: emails.outsider },
    },
    categoryId,
    professionalProfileId: proProfile.id,
    leadA1Id: leadA1.id,
    leadA2Id: leadA2.id,
    leadB1Id: leadB1.id,
    quoteId: quote.id,
    projectId: project.id,
    conversationId: conversation.id,
    messageId: msg.id,
  }
}

export async function teardownTestData(admin: SupabaseClient, td: TestData) {
  const userIds = [
    td.userIds.clientA.id,
    td.userIds.clientB.id,
    td.userIds.professional.id,
    td.userIds.outsider.id,
  ]

  const { data: proProfiles } = await admin
    .from('professional_profiles')
    .select('id')
    .in('user_id', userIds)

  const proIds = (proProfiles ?? []).map((p: { id: string }) => p.id)

  for (const del of [
    admin.from('messages').delete().in('conversation_id', [td.conversationId]),
    admin.from('conversations').delete().eq('id', td.conversationId),
    admin.from('projects').delete().eq('quote_id', td.quoteId),
    admin.from('projects').delete().eq('id', td.projectId),
    admin.from('quotes').delete().eq('id', td.quoteId),
    admin.from('leads').delete().in('id', [td.leadA1Id, td.leadA2Id, td.leadB1Id]),
    admin.from('professional_categories').delete().in('professional_id', proIds),
    admin.from('portfolio_items').delete().in('professional_id', proIds),
  ]) {
    try { await del } catch { /* best effort */ }
  }

  for (const pid of proIds) {
    try { await admin.from('professional_profiles').delete().eq('id', pid) } catch { /* best effort */ }
  }

  await Promise.all(userIds.map((id) => deleteAuthUser(admin, id).catch(() => {})))
}

export async function authenticateUser(email: string): Promise<SupabaseClient> {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  })
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`)
  return client
}

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
