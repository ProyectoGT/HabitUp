# QA Checklist

## Tecnico

- `npm.cmd run typecheck` en `habitup/`.
- `npx.cmd expo config --type public` carga variables.
- App arranca en web o dispositivo.
- No hay claves privadas en archivos versionados.
- `.env.local` no esta versionado.

## Auth

- Registro cliente.
- Registro profesional.
- Login correcto.
- Logout correcto.
- Profesional sin perfil va a onboarding.

## Cliente

- Crear lead con categoria, titulo, descripcion, ciudad, presupuesto y urgencia.
- Ver lead en "Mis solicitudes".
- Ver presupuestos recibidos.
- Aceptar presupuesto.
- Ver proyecto creado.
- Abrir chat.
- Confirmar finalizacion.
- Crear resena.

## Profesional

- Completar onboarding.
- Seleccionar categorias.
- Ver leads disponibles.
- Abrir detalle de lead sin datos sensibles del cliente.
- Enviar presupuesto.
- Ver proyecto tras aceptacion.
- Enviar mensaje.
- Marcar "Trabajo finalizado".

## Seguridad Manual

- Profesional no ve leads cancelados.
- Cliente no ve proyectos ajenos.
- Profesional no ve proyectos ajenos.
- Usuario no participante no puede leer mensajes.
- Cliente no puede crear review antes de completar proyecto.
- No se puede crear segunda review para el mismo proyecto.

## UX

- Estados vacios comprensibles.
- Errores visibles.
- Botones no tapan contenido importante.
- Textos en espanol.
- Pantallas principales funcionan en movil estrecho.

## Pendiente Automatizar

- Validacion de formulario lead.
- Validacion de quote.
- RPC `accept_quote`.
- Calculo de rating.
- RLS messages/projects/reviews.
