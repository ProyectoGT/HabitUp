# Tests RLS — HabitUp

Suite de tests de Row-Level Security para Supabase.

## Requisitos

- Node 18+ con `npx tsx` (se instala automticamente)
- Supabase local en ejecucin (`npm run supabase:start`)
- Migraciones aplicadas (`npm run supabase:reset`)
- Seed ejecutado (`supabase db reset` lo incluye)

## Ejecutar

```bash
# Desde habitup/
npm run supabase:test:rls
```

O directamente:

```bash
npx tsx supabase/tests/rls/run.ts
```

## Qu prueba cada test

| #  | Test | Operacin | Policy clave | Resultado esperado |
|----|------|----------|-------------|-------------------|
| 1  | Cliente A ve sus leads | SELECT leads | `leads: clientes ven propios` | OK |
| 2  | Cliente A NO ve leads de B | SELECT leads by id | `leads: clientes ven propios` | Filtrado por RLS |
| 3  | Profesional ve leads activos | SELECT leads | `leads: profesionales ven activos` | OK |
| 4  | Profesional NO modifica leads | UPDATE leads | `leads: clientes actualizan propios` | Bloqueado |
| 5  | Profesional enva quote | INSERT quotes | `quotes: profesionales envan` | OK |
| 6  | Cliente ve quotes de su lead | SELECT quotes | `quotes: clientes ven de sus leads` | OK |
| 7  | Cliente acepta quote | RPC accept_quote | `accept_quote` (SECURITY DEFINER + auth.uid()) | OK |
| 8  | Outsider no ve mensajes | SELECT messages | `messages: participantes leen` | Filtrado |
| 9  | Destinatario marca como ledo | UPDATE messages | **NO EXISTE policy UPDATE en messages** | FALLAR (gap) |
| 10 | Documentos de verificacin | SELECT professional_profiles / view | `professional_profiles: lectura publica` (demasiado abierta) | FALLAR (gap) |

## Gaps de seguridad detectados

Estos tests fallarn intencionadamente hasta que se implementen las policies correspondientes:

### Test 9 — UPDATE en messages
No existe policy `FOR UPDATE` en la tabla `messages`. El destinatario no puede marcar mensajes como ledos.

Hay que crear:
```sql
CREATE POLICY "messages: destinatario marca ledo" ON messages
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid() AND is_read = true);
```

### Test 10 — professional_profiles expone datos sensibles
La tabla `professional_profiles` tiene `FOR SELECT USING (TRUE)`, exponiendo `nif_cif`, `stripe_account_id`, `documents_verified` a cualquier usuario autenticado.

La app debe usar la vista `professionals_with_categories` en lugar de la tabla para consultas pblicas. La vista ya excluye campos sensibles.

## Salida (formato TAP)

Los tests producen salida compatible con TAP (Test Anything Protocol) v14:

```
TAP version 14
1..10
ok 1 - 01 — Cliente A ve sus propios leads
ok 2 - 02 — Cliente A NO ve leads de Cliente B
...
not ok 9 - 09 — Destinatario marca mensaje como ledo
  ---
  message: UPDATE rechazado — falta policy...
  ...
# Total : 10
# Passed: 8
# Failed: 2
```

## CI

Para ejecutar en CI:

```yaml
# .github/workflows/rls-tests.yml (ejemplo)
jobs:
  rls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: npm ci && npm run supabase:test:rls
        working-directory: habitup
```

## Notas

- Los tests crean usuarios reales en `auth.users` va API Admin y los eliminan al finalizar.
- Usan `service_role` para el setup/teardown (bypass RLS).
- Las operaciones de los tests se ejecutan con el rol `authenticated` (RLS activo).
- El RUN_ID (timestamp) garantiza emails nicos entre ejecuciones.
- Si `supabase start` no se ha ejecutado, los tests fallarn al conectar.
