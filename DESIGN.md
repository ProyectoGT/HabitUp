# HabitUp Design System

## 1. Design Direction

HabitUp es una aplicación móvil de producto. El diseño debe desaparecer detrás de la tarea: familiar, legible, compacto y consistente. La identidad se expresa mediante una voz clara, una composición cuidada y un único acento de marca, no mediante decoración.

La estrategia de color es restringida. Las superficies son neutras y el color de marca queda reservado para la acción primaria, la selección actual, el foco y estados informativos concretos.

## 2. Supported Surfaces

- Prioridad 1: iOS y Android mediante Expo/React Native.
- Prioridad 2: web móvil para desarrollo, soporte y validación.
- Prioridad 3: web de escritorio como adaptación funcional, no como referencia de composición móvil.

Anchos mínimos de validación: 320, 360, 375, 390, 430, 768 y 1024 px.

## 3. Color Roles

La implementación final migrará los valores a tokens con nombres semánticos. Se conservará inicialmente el índigo existente como hipótesis de marca, pero se eliminará el degradado violeta y se ajustará su uso después de validar contraste.

- `background`: fondo general de la aplicación.
- `surface`: controles, barras y superficies elevadas cuando la jerarquía lo requiera.
- `surface-subtle`: agrupaciones y estados de baja intensidad.
- `text`: contenido principal.
- `text-muted`: contenido secundario que mantenga contraste AA.
- `border`: separación y contornos de controles.
- `brand`: acciones primarias, selección y foco.
- `brand-pressed`: estado pulsado.
- `success`, `warning`, `error`, `info`: estados semánticos, siempre acompañados de texto o icono.

No se usan degradados de marca, texto con degradado, glassmorphism ni color decorativo sin significado.

## 4. Typography

- Una sola familia sans serif compatible con iOS, Android y web.
- Escala fija para producto, sin titulares fluidos de marketing.
- Peso y tamaño crean jerarquía; no se usan mayúsculas espaciadas como encabezado recurrente.
- El texto de interfaz admite ampliación sin quedar cortado.
- El cuerpo mantiene una longitud máxima aproximada de 65–75 caracteres cuando contiene prosa.

Roles previstos:

- `display`: bienvenida o estado excepcional, uso muy limitado.
- `title`: título principal de pantalla.
- `section`: encabezado de sección.
- `body`: contenido y campos.
- `label`: etiquetas y botones.
- `caption`: ayuda y metadatos, nunca por debajo del tamaño accesible acordado.

## 5. Spacing and Shape

- Unidad base de espaciado: 4 puntos.
- Escala principal: 4, 8, 12, 16, 20, 24, 32 y 40.
- Margen horizontal móvil habitual: 20 puntos; 16 en anchos mínimos cuando sea necesario.
- Controles: radio de 10–12 puntos.
- Tarjetas: máximo 16 puntos y solo cuando la elevación comunique agrupación real.
- Botones principales pueden usar una forma más redondeada, pero no se mezclan radios arbitrarios.
- Sombras reservadas para navegación flotante, sheets y modales; el contenido se organiza preferentemente con espacio y divisores.

## 6. Navigation

- La autenticación y el onboarding nunca muestran la barra de pestañas.
- Cliente y profesional tienen un máximo de cinco destinos principales visibles.
- Detalles, formularios, rutas dinámicas y verificación se apilan sobre el destino principal y nunca se convierten en pestañas.
- La acción Atrás respeta la pila; una redirección de estado usa `replace` únicamente cuando volver sería incorrecto.
- Toda ruta puede resolver carga, acceso no autorizado y recurso inexistente.

## 7. Components

Todos los controles interactivos deben contemplar: default, hover cuando aplique, focus, pressed, disabled, loading, error y success cuando corresponda.

### Button

- Variantes: primary, secondary, outline, ghost y destructive.
- Etiqueta con verbo y objeto: “Crear cuenta”, “Guardar perfil”, “Reenviar correo”.
- Carga sin cambiar de ancho ni permitir doble envío.
- Área táctil mínima de 44 puntos.

### Input

- Etiqueta persistente; placeholder solo como ejemplo.
- Texto de ayuda y error debajo del campo sin saltos bruscos de composición.
- Mostrar/ocultar contraseña como control accesible.
- Configuración de teclado, capitalización, contenido y autocompletado según el dato.
- El color no es el único indicador de error.

### Feedback

- Skeleton con forma similar al contenido para cargas de página.
- Spinner únicamente dentro de acciones breves o controles compactos.
- Error contextual con explicación, consecuencia y acción de reintento.
- Empty state que explica qué falta y cómo crearlo.
- Toast solo para confirmaciones transitorias; los errores importantes permanecen visibles.

### Selection

- Checkbox para decisiones independientes.
- Radio o segmented control para opciones mutuamente exclusivas.
- Estado seleccionado mediante icono, texto y tratamiento visual, no solo color.

## 8. Forms and Keyboard

- Una columna en móvil.
- El teclado no tapa el campo activo ni la acción principal.
- `KeyboardAvoidingView`, scroll y safe areas se prueban en iOS y Android.
- Los errores aparecen junto al campo y el foco se mueve al primer error al enviar.
- Los datos largos se dividen en pasos con progreso textual, guardado parcial y retorno sin pérdida.

## 9. Motion

- Transiciones de estado entre 150 y 250 ms.
- Sin secuencias decorativas de carga de página.
- Movimiento limitado a navegación, feedback, expansión y cambio de estado.
- `prefers-reduced-motion` o su equivalente nativo reduce o elimina la transición.

## 10. Content

- Español claro y cercano.
- Se explica qué sucede y qué puede hacer el usuario después.
- Los errores técnicos de Supabase no se muestran directamente.
- Los estados usan el mismo nombre en todas las pantallas.
- Se evita “OK”, “Continuar” sin contexto y mensajes genéricos sin solución.

## 11. Definition of Done for a Screen

Una pantalla no se considera terminada hasta que:

- Funciona en iOS, Android y web móvil.
- Resuelve carga, vacío, error, éxito y falta de conexión cuando apliquen.
- Soporta teclado, safe area, texto ampliado y lector de pantalla.
- No expone rutas ni términos técnicos.
- Tiene una única acción principal inequívoca.
- Supera lint, typecheck y pruebas asociadas.
