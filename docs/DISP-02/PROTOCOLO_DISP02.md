# Protocolo DISP-02 — Compatibilidad del portal web en móvil

## Objetivo

Comprobar que el **portal web** de este repositorio se puede usar en un teléfono, con Google Chrome en Android y Safari en iPhone.

Esta prueba es del sitio web responsive. No sustituye la prueba de la app Capacitor (`APPFRONTENDODONTO`), que es otro repositorio.

Ningún caso de este protocolo se ejecutó al escribirlo. El estado inicial de todos los casos es **Pendiente**.

## Alcance

Dentro:

- Ingreso, perfil, menús, citas, agenda según el rol, listas, formularios, diálogos, errores, orientación, scroll, sesión, botones y fechas.
- Rol paciente y rol odontólogo.
- Chrome en Android y Safari en iPhone.

Fuera:

- Escritorio, salvo como apoyo para preparar cuentas.
- Generación del APK.
- Cambios de citas o historias clínicas sobre pacientes reales.

## Navegadores y dispositivos

| Navegador | Sistema | Dispositivo |
| --- | --- | --- |
| Google Chrome (versión estable actual del teléfono) | Android | Teléfono físico. Anotar marca, modelo y versión de Android. |
| Safari | iOS / iPadOS en iPhone | iPhone físico. Anotar modelo y versión de iOS. El requisito del protocolo es iPhone, no iPad. |

Anotar el tamaño de la ventana en vertical y en horizontal. No hace falta un modelo concreto: el protocolo pide el teléfono real, no un emulador. Si solo hay emulador, el caso queda **Bloqueado**, no Aprobado.

## Requisitos de prueba

- Build o entorno publicado identificado (URL y, si se conoce, commit). No mezclar resultados de dos URLs en la misma fila.
- Cuentas de **prueba** de paciente y de odontólogo, autorizadas por el equipo.
- Al menos una cita de prueba en estado conocido para el odontólogo (confirmada y ya iniciada, y otra futura) si se va a mirar los botones de agenda.
- Conexión a la API configurada en ese entorno (`VITE_API_URL`).
- No usar cuentas ni historias de pacientes reales cuando el caso escriba datos.

## Preparación de cuentas

1. El equipo entrega dos cuentas de prueba: una con rol `PACIENTE` y otra con rol `ODONTOLOGO`.
2. Anotar solo el correo en el informe, nunca la contraseña ni el token.
3. Cerrar sesión al pasar de un rol a otro. La sesión está en `localStorage`, clave `odontosystem.sesion`.
4. En Safari, desactivar el bloqueo total de cookies del sitio si la sesión no persiste; anotarlo en observaciones.
5. Los casos que llaman a `PATCH` de citas o a `POST` de historia clínica solo se ejecutan si la cita pertenece a la cuenta de prueba.

## Qué hay hoy en la interfaz (revisión de código, no es un resultado)

Esto orienta el resultado esperado. No demuestra que se vea bien en el teléfono.

- El viewport está en `src/routes/__root.tsx`: `width=device-width, initial-scale=1`.
- Paciente: barra superior. Los enlaces se ocultan bajo `md` y aparece un botón de menú (`src/components/AppShell.tsx`). Enlaces: Buscar dentista, Mi panel, Mi perfil, Reclamos. Perfil y configuración también están en el menú de la cuenta.
- Odontólogo: menú lateral fijo. Bajo `md` queda fuera de la pantalla y se abre con el botón «Abrir menú». Rutas del menú en `src/lib/nav-dentista.ts`: dashboard, agenda, pacientes, horarios, consultorio, liquidaciones, reclamos, perfil, configuración.
- `Input` y `Textarea` usan `text-base` y en `md` pasan a `text-sm` (`src/components/ui/input.tsx`, `textarea.tsx`).
- Fechas de citas: `America/Lima` en `src/lib/odontologos.ts` (`fechaDe`, `horaDe`, `fechaLarga`). El historial clínico usa la misma zona en `fechaAtencionVisible`.
- Tablas de pacientes, historial, panel, liquidaciones y dashboard envuelven la tabla en `overflow-x-auto`. La semana de la agenda también. Ese scroll interno es intencional. El caso 11 mira el scroll de **la página**, no el de ese contenedor.
- La vista mes de la agenda usa `grid-cols-7` sin contenedor de scroll propio.
- Los diálogos de Radix se centran con `fixed` y `translate`. El de historia clínica limita la altura (`max-h-[85vh]`). El aviso de política usa `90dvh`. El resto de diálogos base no usa `dvh` ni `safe-area`.
- El menú del odontólogo usa `h-screen`. No hay `env(safe-area-inset-*)` en el código revisado.
- El chatbot es un botón `fixed` abajo a la derecha. El panel mide 560 px de alto (`src/components/ChatbotWidget.tsx`).
- Errores de API: el cliente lee `mensaje` del JSON. El ingreso muestra ese texto. La agenda muestra un toast de Sonner.

Puntos a vigilar en Safari iPhone durante la ejecución (hipótesis, no defectos confirmados):

- Barras del navegador y `h-screen` / `100vh` en el menú del odontólogo.
- Teclado virtual tapando un diálogo centrado.
- Panel del chatbot más alto que la pantalla en horizontal.
- `position: sticky` con `backdrop-blur` en la cabecera del paciente.
- Mapas Leaflet (catálogo y ficha del odontólogo) y gestos táctiles.
- Zoom automático si algún campo pisa el `text-base` con una clase más pequeña.

## Procedimiento

1. Completar la cabecera de `INFORME_DISP02.md` (dispositivo, OS, navegador, URL).
2. Elegir la fila de `MATRIZ_COMPATIBILIDAD.csv` (mismo navegador, OS y rol).
3. Ejecutar el caso. No adelantar el estado.
4. Anotar resultado obtenido, estado y evidencia.
5. Si falta cuenta, cita de prueba o dispositivo, estado **Bloqueado** y el motivo. No usar **Aprobado**.
6. Repetir en el otro navegador y en el otro rol cuando el caso lo pida.
7. Actualizar los totales del informe solo con filas ya ejecutadas.

## Casos de prueba — paciente

Rutas reales: `/`, `/paciente/catalogo`, `/paciente/panel`, `/paciente/perfil`, `/paciente/configuracion`, `/paciente/dentista/$id`, `/paciente/agendar/$id`, `/reclamos`, `/recuperar`.

| ID base | Caso | Pasos | Resultado esperado |
| --- | --- | --- | --- |
| P01 | Inicio de sesión | Abrir `/`. Entrar con la cuenta de prueba paciente. | El backend responde y la interfaz lleva al flujo de paciente. Un error de credenciales muestra el mensaje, sin cambiar de rol. |
| P02 | Perfil | Abrir Mi perfil. | Se ven los datos que devuelve la API, sin desbordar la pantalla. |
| P03 | Menú | En ancho de teléfono, abrir y cerrar el menú. Ir a Buscar dentista, Mi panel, Mi perfil y Reclamos. | El menú cabe en la pantalla. Cada enlace abre su ruta. |
| P04 | Citas | Abrir Mi panel. | La lista de citas del paciente se lee. Si no hay citas, se distingue el vacío de un error. |
| P05 | Agenda según rol | Con paciente, abrir `/dentist/agenda`. | La agenda de atención indica que es solo para la sesión del odontólogo (`dentist.agenda.tsx`). No muestra acciones de completar cita. |
| P06 | Listas y tablas | En Mi panel, revisar la lista o tabla de citas. | El contenido se lee. Si la tabla hace scroll, el scroll queda dentro del recuadro. |
| P07 | Formulario | En el ingreso, pasar a registro y revisar los campos sin enviar un alta real; o editar un dato permitido del perfil de prueba y cancelar si no hay autorización para guardar. | Los campos se leen y reciben foco. El teclado no impide llegar al botón principal. |
| P08 | Modal | Abrir el modal de términos en el registro y cerrarlo. | El diálogo se ve entero o hace scroll interno. Se cierra con la X o la acción de cierre. El fondo no queda bloqueado. |
| P09 | Error | En `/`, intentar entrar con una contraseña incorrecta de la cuenta de prueba. | Aparece el mensaje de error. No se crea sesión. |
| P10 | Orientación | En Mi panel, girar a horizontal y volver a vertical. | El contenido sigue usable. No se pierde la sesión. |
| P11 | Scroll horizontal | En catálogo y en Mi panel, en vertical. | No aparece scroll horizontal de la página. El scroll interno de una tabla no cuenta como fallo. |
| P12 | Sesión | Iniciar sesión, ir a otra ruta, recargar. | La sesión sigue. Cerrar sesión vuelve a `/` y la siguiente ruta privada no usa el token anterior. |
| P13 | Botones | Usar menú, campana de notificaciones, buscar y un botón de la ficha o del panel. | El control responde al toque y no queda fuera de la pantalla. |
| P14 | Fechas y horas | En una cita de prueba, leer fecha y hora. | Coinciden con la hora de Lima (`America/Lima`), no con otra zona del teléfono. |

## Casos de prueba — odontólogo

Rutas reales: `/dentist/dashboard`, `/dentist/agenda`, `/dentist/pacientes`, `/dentist/historial/$pacienteId`, `/dentist/horarios`, `/dentist/consultorio`, `/dentist/liquidaciones`, `/dentist/reclamos`, `/dentist/perfil`, `/dentist/configuracion`.

| ID base | Caso | Pasos | Resultado esperado |
| --- | --- | --- | --- |
| O01 | Inicio de sesión | Entrar con la cuenta de prueba odontólogo. | La interfaz muestra el menú del odontólogo. |
| O02 | Perfil | Abrir Mi perfil. | Se ve el perfil profesional devuelto por la API. |
| O03 | Menú | Abrir el menú en el teléfono y recorrer los enlaces de `RUTAS_MENU_DENTISTA`. | El panel se abre y se cierra. Los enlaces no quedan tapados por el pie del menú. |
| O04 | Citas | En Agenda, vista día. | Se listan las citas de ese día o el vacío «No tienes citas este día». |
| O05 | Agenda según rol | En una cita `CONFIRMADA` cuyo inicio ya pasó, mirar Atendida e Inasistencia. En una cita futura, no deben mostrarse. | La visibilidad sigue `accionesDeCita`. No pulsar Inasistencia ni Atendida salvo cita de prueba autorizada. |
| O06 | Listas y tablas | Pacientes y, si hay un paciente de prueba, su historial. | La tabla se desplaza dentro de `overflow-x-auto` si no cabe. Los datos son del paciente elegido. |
| O07 | Formulario | Abrir Registrar historia solo en una cita de prueba `COMPLETADA`, o limitarse a abrir y cancelar. | Diagnóstico y tratamiento se pueden escribir. Cancelar no envía el POST. |
| O08 | Modal | Abrir el diálogo de inasistencia y pulsar Volver, sin confirmar, en una cita de prueba. | El diálogo cabe en la pantalla y se cierra. La cita no cambia de estado. |
| O09 | Error | Con una cita de prueba confirmada dentro de los primeros 15 minutos, confirmar inasistencia solo si el equipo autorizó esa cita. | El toast muestra el `mensaje` del 409 y el estado sigue Confirmada. Si no hay cita de prueba, el caso queda Bloqueado. |
| O10 | Orientación | Girar la agenda día y la vista semana. | Los botones siguen alcanzables. La semana puede hacer scroll interno. |
| O11 | Scroll horizontal | Dashboard y agenda día, en vertical. | La página no se desplaza de lado. La vista semana sí puede hacerlo dentro de su caja. |
| O12 | Sesión | Recargar en `/dentist/agenda`. Cerrar sesión. | La recarga mantiene al odontólogo. Tras salir, no se llama a la API con el token viejo. |
| O13 | Botones | Menú, confirmar una cita de prueba solo si está autorizado, y los botones de vista Día/Semana/Mes. | El control pulsado cambia la vista o muestra el resultado de la API. |
| O14 | Fechas y horas | Comparar la hora de una cita en la agenda con el `inicio` de la API en Lima. | La hora mostrada es la de `America/Lima`. |

El caso O09 modifica una cita. Solo con datos de prueba. Si la cita ya superó los 15 minutos, no fuerza un 409: anotar Bloqueado por no cumplir la ventana, o ejecutar el camino de éxito en otra fila si el equipo lo pide. No marcar Aprobado el 409 sin haber visto el status 409.

## Criterios de aceptación

Un caso pasa solo si:

- el resultado observado coincide con el esperado de la matriz;
- no hay scroll horizontal de la página cuando el caso lo prohíbe;
- los controles caben y se pueden pulsar con el dedo;
- los errores visibles son los de la API o la validación, no una pantalla en blanco;
- la evidencia permite repetir el caso (dispositivo, navegador, rol, URL).

El protocolo completo no se considera aceptado mientras exista alguna fila Pendiente o Fallida en Chrome Android o Safari iPhone para los casos P01–P14 y O01–O14. Bloqueado impide cerrar DISP-02.

## Clasificación de defectos

| Severidad | Cuándo usarla |
| --- | --- |
| Bloqueante | No se puede entrar, la sesión se pierde al recargar, se escribe en datos que no son de prueba, o el rol ve acciones del otro rol y la API las acepta. |
| Alto | Un flujo principal no se completa: menú inutilizable, modal que no cierra, formulario tapado por el teclado sin forma de enviar o cancelar, cita que cambia de estado cuando el servidor rechazó la acción. |
| Medio | Scroll horizontal de la página, texto cortado, fecha u hora en una zona distinta de Lima, tabla ilegible. |
| Bajo | Alineación, contraste menor, solapamiento que no impide la tarea. |

## Evidencias

Por cada caso ejecutado:

- captura de la pantalla completa del teléfono;
- navegador y versión, modelo, OS y orientación;
- URL y rol;
- si hubo error de red, el status HTTP y el campo `mensaje`, con el header `Authorization` tapado;
- fecha y hora de la ejecución.

Guardar las capturas fuera del repositorio o en una ruta que el equipo indique. No subir tokens ni contraseñas. En la matriz, la columna Evidencia lleva el nombre del archivo o el enlace, no la imagen embebida.
