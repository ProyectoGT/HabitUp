import type { SupabaseClient } from '@supabase/supabase-js'
import type { TestData } from './helpers'

export interface TestResult {
  pass: boolean
  name: string
  message: string
  details?: Record<string, unknown>
}

export async function test01_clientA_sees_own_leads(
  clientA: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await clientA
    .from('leads')
    .select('*')
    .eq('client_id', td.userIds.clientA.id)

  if (error) return { pass: false, name: 'Cliente A ve sus propios leads', message: `Query error: ${error.message}`, details: { error } }

  if (!data || data.length === 0) {
    return { pass: false, name: 'Cliente A ve sus propios leads', message: 'No se devolvieron leads', details: { data, expectedAtLeast: 1 } }
  }

  const foreign = data.filter((l) => l.client_id !== td.userIds.clientA.id)
  if (foreign.length > 0) {
    return { pass: false, name: 'Cliente A ve sus propios leads', message: `Vio ${foreign.length} leads de otros clientes`, details: { foreign } }
  }

  return { pass: true, name: 'Cliente A ve sus propios leads', message: `OK — ${data.length} lead(es) propios visibles` }
}

export async function test02_clientA_cannot_see_clientB_leads(
  clientA: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data } = await clientA
    .from('leads')
    .select('id')
    .eq('id', td.leadB1Id)
    .maybeSingle()

  if (data) {
    return { pass: false, name: 'Cliente A NO ve leads de Cliente B', message: 'Pudo ver un lead que pertenece a Cliente B', details: { leadBId: td.leadB1Id } }
  }

  return { pass: true, name: 'Cliente A NO ve leads de Cliente B', message: 'OK — lead de cliente B filtrado por RLS' }
}

export async function test03_professional_sees_active_leads(
  professional: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await professional
    .from('leads')
    .select('*')

  if (error) return { pass: false, name: 'Profesional ve leads activos', message: `Query error: ${error.message}`, details: { error } }

  if (!data || data.length === 0) {
    return { pass: false, name: 'Profesional ve leads activos', message: 'No vio nign lead activo', details: { data, expectedAtLeast: 1 } }
  }

  const nonActive = data.filter((l) => l.status !== 'activo')
  if (nonActive.length > 0) {
    return { pass: false, name: 'Profesional ve leads activos', message: `Vio ${nonActive.length} lead(es) con estado distinto a activo`, details: { nonActive } }
  }

  return { pass: true, name: 'Profesional ve leads activos', message: `OK — ${data.length} lead(es) activos visibles` }
}

export async function test04_professional_cannot_update_client_lead(
  professional: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await professional
    .from('leads')
    .update({ title: 'HACKED by professional' })
    .eq('id', td.leadA1Id)
    .select('id')

  const mutated = Array.isArray(data) ? data : []
  const blocked = error !== null || mutated.length === 0

  if (!blocked) {
    return { pass: false, name: 'Profesional NO modifica leads de clientes', message: 'Pudo modificar un lead ajeno', details: { affected: mutated } }
  }

  return { pass: true, name: 'Profesional NO modifica leads de clientes', message: 'OK — RLS bloque UPDATE', details: { error, dataLength: mutated.length } }
}

export async function test05_professional_sends_quote(
  professional: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await professional
    .from('quotes')
    .insert({
      lead_id: td.leadA1Id,
      professional_id: td.professionalProfileId,
      amount: 999,
      currency: 'EUR',
      description: 'Quote de test RLS',
      status: 'enviado',
    })
    .select('id')
    .single()

  if (error) {
    return { pass: false, name: 'Profesional enva quote', message: `INSERT rechazado por RLS: ${error.message}`, details: { error } }
  }

  return { pass: true, name: 'Profesional enva quote', message: 'OK — quote insertada', details: { quoteId: data?.id } }
}

export async function test06_client_sees_quotes_for_own_lead(
  clientA: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await clientA
    .from('quotes')
    .select('*')
    .eq('lead_id', td.leadA1Id)

  if (error) return { pass: false, name: 'Cliente ve quotes de sus leads', message: `Query error: ${error.message}`, details: { error } }

  if (!data || data.length === 0) {
    return { pass: false, name: 'Cliente ve quotes de sus leads', message: 'No vio quotes en su lead', details: { expectedAtLeast: 1 } }
  }

  return { pass: true, name: 'Cliente ve quotes de sus leads', message: `OK — ${data.length} quote(s) visibles` }
}

export async function test07_client_accepts_quote(
  clientA: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await clientA.rpc('accept_quote', {
    p_quote_id: td.quoteId,
  })

  if (error) {
    return { pass: false, name: 'Cliente acepta quote de su lead', message: `accept_quote RPC fall: ${error.message}`, details: { error } }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { pass: false, name: 'Cliente acepta quote de su lead', message: 'RPC no devolvi project_id', details: { data } }
  }

  return { pass: true, name: 'Cliente acepta quote de su lead', message: `OK — project creado: ${data[0].project_id}`, details: { projectId: data[0].project_id } }
}

export async function test08_outsider_cannot_read_project_messages(
  outsider: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { data, error } = await outsider
    .from('messages')
    .select('id')
    .eq('project_id', td.projectId)

  if (error) return { pass: false, name: 'No participante NO lee mensajes ajenos', message: `Query error: ${error.message}`, details: { error } }

  if (data && data.length > 0) {
    return { pass: false, name: 'No participante NO lee mensajes ajenos', message: `Vio ${data.length} mensaje(s) de un proyecto ajeno`, details: { data } }
  }

  return { pass: true, name: 'No participante NO lee mensajes ajenos', message: 'OK — 0 mensajes visibles para no participante' }
}

export async function test09_recipient_marks_message_as_read(
  clientA: SupabaseClient,
  professional: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const { error } = await clientA
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', td.messageId)
    .eq('recipient_id', td.userIds.clientA.id)

  if (error) {
    return {
      pass: false,
      name: 'Destinatario marca mensaje como ledo',
      message: `UPDATE rechazado — falta policy UPDATE en messages. Error: ${error.message}`,
      details: { error },
    }
  }

  const { data: msg, error: checkErr } = await clientA
    .from('messages')
    .select('is_read, read_at')
    .eq('id', td.messageId)
    .single()

  if (checkErr) {
    return { pass: false, name: 'Destinatario marca mensaje como ledo', message: `No se pudo verificar UPDATE: ${checkErr.message}`, details: { checkErr } }
  }

  if (!msg?.is_read) {
    return { pass: false, name: 'Destinatario marca mensaje como ledo', message: 'UPDATE report xito pero is_read sigue siendo false' }
  }

  return { pass: true, name: 'Destinatario marca mensaje como ledo', message: 'OK — mensaje marcado como ledo' }
}

export async function test10_verification_docs_visibility(
  outsider: SupabaseClient,
  td: TestData,
): Promise<TestResult> {
  const gaps: string[] = []

  const { data: tableData, error: tableErr } = await outsider
    .from('professional_profiles')
    .select('nif_cif, stripe_account_id, documents_verified')
    .eq('id', td.professionalProfileId)
    .maybeSingle()

  if (tableErr) {
    return { pass: false, name: 'Documentos de verificacin', message: `Error consultando tabla: ${tableErr.message}`, details: { tableErr } }
  }

  if (tableData?.nif_cif !== null && tableData?.nif_cif !== undefined) {
    gaps.push('nif_cif expuesto en tabla professional_profiles')
  }
  if (tableData?.stripe_account_id !== null && tableData?.stripe_account_id !== undefined) {
    gaps.push('stripe_account_id expuesto en tabla professional_profiles')
  }
  if (tableData?.documents_verified !== null && tableData?.documents_verified !== undefined) {
    gaps.push('documents_verified expuesto en tabla professional_profiles')
  }

  const { data: viewData } = await outsider
    .from('professionals_with_categories')
    .select('*')
    .eq('id', td.professionalProfileId)
    .maybeSingle()

  const viewExposesSensitive =
    viewData &&
    ('nif_cif' in viewData || 'stripe_account_id' in viewData || 'documents_verified' in viewData)

  if (viewExposesSensitive) {
    gaps.push('La vista professionals_with_categories expone campos sensibles')
  }

  if (gaps.length > 0) {
    return {
      pass: false,
      name: 'Documentos de verificacin',
      message: 'Hay fugas de datos sensibles detectadas',
      details: { gaps },
    }
  }

  return { pass: true, name: 'Documentos de verificacin', message: 'OK — vista no expone campos sensibles y tabla tiene acceso pblico (gap conocido)' }
}

export type TestFn = (td: TestData, clients: Record<string, SupabaseClient>) => Promise<TestResult>

export const ALL_TESTS: { name: string; fn: TestFn }[] = [
  { name: '01 — Cliente A ve sus propios leads', fn: (td, c) => test01_clientA_sees_own_leads(c.clientA, td) },
  { name: '02 — Cliente A NO ve leads de Cliente B', fn: (td, c) => test02_clientA_cannot_see_clientB_leads(c.clientA, td) },
  { name: '03 — Profesional ve leads activos', fn: (td, c) => test03_professional_sees_active_leads(c.professional, td) },
  { name: '04 — Profesional NO modifica leads de clientes', fn: (td, c) => test04_professional_cannot_update_client_lead(c.professional, td) },
  { name: '05 — Profesional enva quote', fn: (td, c) => test05_professional_sends_quote(c.professional, td) },
  { name: '06 — Cliente ve quotes de sus leads', fn: (td, c) => test06_client_sees_quotes_for_own_lead(c.clientA, td) },
  { name: '07 — Cliente acepta quote de su lead', fn: (td, c) => test07_client_accepts_quote(c.clientA, td) },
  { name: '08 — No participante NO lee mensajes ajenos', fn: (td, c) => test08_outsider_cannot_read_project_messages(c.outsider, td) },
  { name: '09 — Destinatario marca mensaje como ledo', fn: (td, c) => test09_recipient_marks_message_as_read(c.clientA, c.professional, td) },
  { name: '10 — Documentos de verificacin', fn: (td, c) => test10_verification_docs_visibility(c.outsider, td) },
]
