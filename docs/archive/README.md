# Archivos Legacy

Este directorio contiene ficheros del proyecto anterior **Reforma360** y esquemas
previos de **HabitUp** que han sido reemplazados por migraciones versionadas.

## Contenido

| Fichero | Procedencia | Razón del archivo |
|---------|-------------|-------------------|
| `reforma360_schema.sql` | Esquema PostgreSQL inicial del MVP Reforma360 | Reemplazado por migraciones incrementales en `habitup/supabase/migrations/` |
| `habitup_schema.sql` | `supabase/habitup_schema.sql` | Schema alternativo con tablas extra (payments, commissions, favorites, verification_documents, PostGIS). No es el schema canónico; se conserva como referencia para futura expansión. |
| `migrations/000_schema_base.sql` | Primera migración canónica | Reemplazada por migraciones versionadas con timestamp (20250101...) |
| `migrations/001_add_push_notifications.sql` | Segunda migración canónica | Reemplazada — contenido integrado en las nuevas migraciones |
| `migrations/002_mvp_core_loop.sql` | Tercera migración canónica | Reemplazada — contenido integrado en las nuevas migraciones |

## Schema canónico actual

El esquema activo se define en las migraciones dentro de
`habitup/supabase/migrations/`, aplicadas por orden de timestamp.

Para regenerar desde cero:

```bash
cd habitup
supabase db reset
```

Para generar los tipos TypeScript:

```bash
# Local
supabase gen types typescript --local > src/types/database.types.ts

# Remoto (requiere EXPO_PUBLIC_SUPABASE_PROJECT_ID en .env)
supabase gen types typescript --project-id "$EXPO_PUBLIC_SUPABASE_PROJECT_ID" > src/types/database.types.ts
```

> **Nota:** No usar ninguno de los ficheros archivados en proyectos nuevos.
> Se conservan exclusivamente por referencia histórica.
