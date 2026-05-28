import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createAdminClient,
  setupTestData,
  teardownTestData,
  authenticateUser,
  type TestData,
} from './helpers'
import { ALL_TESTS, type TestResult } from './suite'

function tryLoadEnv(): void {
  const candidates = ['.env.local', '.env'].map((f) => join(process.cwd(), f))
  for (const filepath of candidates) {
    if (!existsSync(filepath)) continue
    try {
      const content = readFileSync(filepath, 'utf-8')
      for (const raw of content.split('\n')) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        let val = line.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (key && !process.env[key]) process.env[key] = val
      }
    } catch {
      // ignore
    }
  }
}

tryLoadEnv()

const RUN_ID = Date.now()
const START = Date.now()

interface RunSummary {
  total: number
  passed: number
  failed: number
}

function tapVersion(): string {
  return 'TAP version 14'
}

function tapPlan(count: number): string {
  return `1..${count}`
}

function tapOk(index: number, pass: boolean, description: string, message?: string, details?: Record<string, unknown>): string {
  const status = pass ? 'ok' : 'not ok'
  let output = `${status} ${index} - ${description}`
  if (!pass && (message || details)) {
    output += `\n  ---\n  message: ${message ?? ''}`
    if (details) {
      const yaml = Object.entries(details)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join('\n')
      output += `\n${yaml}`
    }
    output += '\n  ...'
  }
  return output
}

function tapSummary(s: RunSummary): string {
  const lines = [`# ${'='.repeat(50)}`, `# Total : ${s.total}`, `# Passed: ${s.passed}`, `# Failed: ${s.failed}`]
  if (s.failed > 0) {
    lines.push('# ⚠  Algunos tests fallaron — revisa los detalles arriba')
  }
  lines.push(`# Time  : ${Date.now() - START}ms`)
  return lines.join('\n')
}

async function main(): Promise<number> {
  const admin = createAdminClient()
  let td: TestData | null = null
  const results: { index: number; result: TestResult }[] = []
  let authError: string | null = null

  console.log(tapVersion())

  try {
    td = await setupTestData(admin, RUN_ID)

    const clients: Record<string, SupabaseClient> = {
      clientA: await authenticateUser(td.userIds.clientA.email),
      clientB: await authenticateUser(td.userIds.clientB.email),
      professional: await authenticateUser(td.userIds.professional.email),
      outsider: await authenticateUser(td.userIds.outsider.email),
    }

    console.log(tapPlan(ALL_TESTS.length))

    for (let i = 0; i < ALL_TESTS.length; i++) {
      const { name, fn } = ALL_TESTS[i]
      try {
        const result = await fn(td, clients)
        results.push({ index: i + 1, result })
        console.log(tapOk(i + 1, result.pass, name, result.message, result.details))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ index: i + 1, result: { pass: false, name, message: `Excepcin no capturada: ${msg}` } })
        console.log(tapOk(i + 1, false, name, `Excepcin: ${msg}`))
      }
    }
  } catch (err) {
    authError = err instanceof Error ? err.message : String(err)
    console.log(`# FATAL — Setup fall: ${authError}`)
  } finally {
    if (td) {
      try {
        await teardownTestData(admin, td)
      } catch {
        // best-effort cleanup
      }
    }
  }

  if (authError) {
    console.log(`# Cleanup completado (setup fall — no se ejecutaron tests)`)
    return 2
  }

  const passed = results.filter((r) => r.result.pass).length
  const failed = results.filter((r) => !r.result.pass).length
  const summary: RunSummary = { total: results.length, passed, failed }
  console.log(tapSummary(summary))

  return failed > 0 ? 1 : 0
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`FATAL: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(2)
  })
