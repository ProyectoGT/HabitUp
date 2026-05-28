# Security And RLS

## Principios

- No usar politicas `true` salvo lectura publica deliberada.
- No mostrar telefono/email en leads publicos.
- No mostrar direccion exacta antes de aceptar presupuesto.
- Solo participantes pueden ver proyectos y mensajes.
- Solo el cliente propietario puede aceptar presupuestos de su lead.
- Solo proyectos completados admiten resenas verificadas.

## Politicas Relevantes

### users

- El usuario ve/actualiza su propio perfil.
- Los perfiles profesionales activos pueden mostrarse para marketplace.

### leads

- Cliente ve y modifica sus propios leads.
- Profesionales ven leads activos.
- Profesionales ven leads asignados a ellos tras aceptacion.

### quotes

- Profesional ve sus propios presupuestos.
- Cliente ve presupuestos de sus leads.
- La aceptacion segura debe hacerse con `accept_quote()`.

### projects

- Cliente ve sus proyectos.
- Profesional ve sus proyectos.
- Actualizacion permitida a participantes, con trigger de transiciones.

### messages

Migracion 002 endurece acceso:

- Lectura solo si el usuario participa en el proyecto.
- Insercion solo si `sender_id = auth.uid()` y `recipient_id` es la otra parte real.

### reviews

- Lectura publica.
- Insercion solo si:
  - `reviewer_id = auth.uid()`.
  - El proyecto pertenece al cliente.
  - El proyecto esta `completado`.
  - No existe review previa por constraint unico de `project_id`.

## Transiciones De Proyecto

Trigger `enforce_project_status_transition()`:

- Profesional puede pasar de `en_curso` a `pendiente_finalizacion`.
- Cliente puede pasar de `pendiente_finalizacion` a `completado`.
- Nadie puede marcar `completado` sin confirmacion cliente.

## Secretos

No deben hardcodearse:

- Supabase anon key real en migraciones.
- Service role key.
- Stripe secret key.
- Webhook secrets.

La migracion `001_add_push_notifications.sql` usa `current_setting` para URL/key de push en lugar de valores hardcodeados.

Ejemplo opcional en SQL:

```sql
ALTER DATABASE postgres SET app.settings.edge_push_url = 'https://<ref>.supabase.co/functions/v1/send-push-notification';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = '<anon-key>';
```

## Riesgos Pendientes

- Falta backoffice admin.
- Falta verificacion documental real.
- Falta Storage RLS.
- El modelo actual usa `users` en vez de `profiles`; documentado como decision incremental.
