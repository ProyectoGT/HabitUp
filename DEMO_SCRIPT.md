# Demo Script

## Objetivo

Demostrar el loop completo cliente-profesional sin pagos:

Cliente crea lead -> profesional envia presupuesto -> cliente acepta -> proyecto -> chat -> finalizacion -> resena.

## Preparacion

1. Configura `.env.local`.
2. Aplica schema y migraciones.
3. Crea dos usuarios en Supabase Auth:
   - Cliente: `cliente.demo@habitup.app`
   - Profesional: `pro.demo@habitup.app`
4. Registra ambos desde la app o crea sus perfiles manualmente.
5. Para el profesional, completa onboarding y selecciona categorias.

Password sugerida para demos locales:

```txt
HabitUpDemo123!
```

No uses estas credenciales en produccion.

## Guion

### 1. Cliente

1. Abre la app.
2. Inicia sesion como cliente.
3. Ve a "Nueva solicitud".
4. Categoria: Banos.
5. Titulo: "Reforma completa de bano".
6. Descripcion: "Necesito cambiar plato de ducha, lavabo, azulejos, suelo y revisar fontaneria. El bano tiene unos 5 m2."
7. Ciudad: Madrid.
8. Presupuesto: 3000 - 6000.
9. Urgencia: Normal.
10. Publica solicitud.

Resultado esperado: la solicitud aparece en "Mis solicitudes".

### 2. Profesional

1. Cierra sesion e inicia como profesional.
2. Abre "Leads disponibles".
3. Entra en la solicitud.
4. Envia presupuesto:
   - Importe: 4800
   - Mensaje: "Incluye demolicion, alicatado, plato de ducha, lavabo, materiales principales y mano de obra."
   - Duracion: 7 dias
5. Confirma envio.

Resultado esperado: el presupuesto queda asociado al lead.

### 3. Cliente Acepta

1. Vuelve como cliente.
2. Abre la solicitud.
3. Revisa presupuestos recibidos.
4. Acepta el presupuesto.

Resultado esperado: se crea un proyecto y la app navega a su detalle.

### 4. Chat

1. En el proyecto, pulsa "Ir al chat".
2. Envia: "Hola, gracias por el presupuesto. Podemos coordinar visita esta semana?"
3. Entra como profesional y responde.

Resultado esperado: ambos ven mensajes en tiempo real.

### 5. Finalizacion

1. Profesional abre el proyecto.
2. Cambia estado a "En curso".
3. Cambia estado a "Trabajo finalizado".
4. Cliente abre el proyecto.
5. Pulsa "Confirmar finalizacion".

Resultado esperado: proyecto queda `completado`.

### 6. Resena

1. Cliente ve seccion "Resena".
2. Deja rating 5 y comentario.

Resultado esperado: se crea review verificada y se recalcula el rating profesional.

## Checklist Visual

- Textos en espanol.
- No se muestran emails ni telefonos en leads publicos.
- El chat solo aparece dentro de proyecto aceptado.
- Review solo aparece tras proyecto completado.
- El profesional no puede marcar completado final sin confirmacion cliente.
