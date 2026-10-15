# Tests RLS - HabitUp

Suite de Row-Level Security para validar el core loop y los limites de privacidad de Supabase.

## Requisitos

- Node 18+
- Supabase local o remoto con migraciones aplicadas
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` si se ejecuta contra remoto

## Ejecutar Local

```bash
cd habitup
npm run supabase:start
npm run supabase:reset
npm run supabase:test:rls
```

El runner usa credenciales locales por defecto si no encuentra `.env.local` o `.env`.

## Ejecutar Contra Remoto

```bash
cd habitup
npx supabase link --project-ref <project-id>
npx supabase db push
cp supabase/tests/.env.example .env.local
npm run supabase:test:rls
```

## Cobertura

| # | Test | Operacion | Policy/RPC clave | Esperado |
| --- | --- | --- | --- | --- |
| 1 | Cliente A ve sus leads | SELECT leads | clientes ven propios | OK |
| 2 | Cliente A no ve leads de B | SELECT leads | clientes ven propios | Filtrado |
| 3 | Profesional ve leads activos | SELECT leads | profesionales activos ven feed | OK |
| 4 | Profesional no modifica leads | UPDATE leads | solo cliente propietario | Bloqueado |
| 5 | Profesional envia quote | INSERT quotes | profesional propietario | OK |
| 6 | Cliente ve quotes de su lead | SELECT quotes | cliente del lead | OK |
| 7 | Cliente acepta quote | RPC `accept_quote` | SECURITY DEFINER + owner check | OK |
| 8 | Outsider no lee mensajes | SELECT messages | participantes leen por `conversation_id` | Filtrado |
| 9 | Destinatario marca leido | UPDATE messages | destinatario marca por conversacion | OK |
| 10 | Privacidad profesional | SELECT table/view | base privada + vista segura | OK |
| 11 | Accept quote idempotente | RPC `accept_quote` | unicidad por quote/proyecto | OK |
| 12 | Cliente B no acepta quote ajeno | RPC `accept_quote` | owner check | Bloqueado |
| 13 | Quote en lead cerrado rechazado | RPC `accept_quote` | estado de lead | Bloqueado |

## Notas De Seguridad

- `messages` usa `conversation_id` como contexto obligatorio.
- `messages.project_id` queda opcional solo para compatibilidad.
- `professional_profiles` completo solo debe ser visible para propietario/admin.
- `professionals_with_categories` es la superficie publica segura para discovery.
- Las senales `nif_cif_verified` y `documents_verified` pueden exponerse como trust flags; no exponer NIF/CIF, email, telefono ni Stripe IDs.

## Salida

El runner emite TAP v14:

```text
TAP version 14
1..13
ok 1 - 01 - Cliente A ve sus propios leads
...
```

## CI

```yaml
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
