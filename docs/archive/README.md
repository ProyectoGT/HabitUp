# Archivo Legacy

Este directorio contiene ficheros del proyecto anterior **Reforma360**, predecesor de **HabitUp**.

## Contenido

| Fichero | Originalmente | Razón del archivo |
|---------|--------------|-------------------|
| `reforma360_schema.sql` | Esquema PostgreSQL inicial del MVP | Reemplazado por migraciones incrementales en `habitup/supabase/migrations/`. Contenía tablas adicionales (payments, commissions, favorites, verification_documents) que fueron integradas o simplificadas en el esquema actual. |

## Schema canónico actual

El esquema activo se define en las migraciones dentro de `habitup/supabase/migrations/`, aplicadas en orden:

1. `000_schema_base.sql` — Tablas base, RLS, triggers, categorías
2. `001_add_push_notifications.sql` — Push notifications vía pg_net
3. `002_mvp_core_loop.sql` — Core loop MVP: accept_quote RPC, transiciones de proyecto, notificaciones

Para un snapshot completo acumulativo, ver `supabase/habitup_schema.sql` en la raíz.

> **Nota:** No usar `reforma360_schema.sql` en proyectos nuevos. Se conserva por referencia histórica.
