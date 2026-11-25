# Informe DISP-02 — ejecución en curso (actualizado el 25/11/2026)

**No declara compatibilidad aprobada.** Tres rondas de evidencias revisadas: `CAPTURAS.zip` (20/11, 20:35–20:44), `CAPTURAS2.0.zip` (20/11, 21:25–21:30) y `CORRECIONES-CAPTURAS.zip` (20/11, 23:03–23:11). Solo se cuentan casos con una captura verificable.

Completar una sección por cada dispositivo real. Copiar los conteos desde `MATRIZ_COMPATIBILIDAD.csv` después de ejecutar las filas. No rellenar «Aprobado» sin una fila ejecutada.

## Identificación

| Campo | Valor |
| --- | --- |
| Producto | Portal web OdontoSystem (este repositorio) |
| URL probada | https://frontend-odonto-system.vercel.app |
| Commit o build | Rondas 1 y 2: `4ceb704`. Ronda 3: `6add4f1` (PR #28, incluye `disp02-fixes-r2.patch`). `disp02-fixes-r3.patch` (O07, ficha del paciente) aún no está desplegado |
| Fecha del informe | 21/11/2026 (rondas del 20/11: 20:35–20:44, 21:25–21:30 y 23:03–23:11) |
| Quién ejecuta | Nicole De La Cruz |

## Dispositivos utilizados

| ID | Tipo | Marca y modelo | Sistema operativo | Navegador | Versión del navegador |
| --- | --- | --- | --- | --- | --- |
| D1 | Teléfono Android | *pendiente de anotar* | *pendiente de anotar* | Google Chrome | *pendiente de anotar* |
| D2 | iPhone | *sin ejecutar* | | Safari | |

Si un dispositivo no estuvo disponible, dejar la fila vacía y marcar sus casos como Bloqueado en la matriz.

## Versiones de navegadores

| Navegador | Versión observada | Dispositivo |
| --- | --- | --- |
| Google Chrome | | |
| Safari | | |

## Resultados

Contar solo filas cuyo Estado dejó de ser Pendiente.

| Métrica | Cantidad |
| --- | --- |
| Total de casos en la matriz | 56 |
| Casos ejecutados | 17 con resultado final (solo Android) |
| Casos aprobados | 17 (P01, P02, P04, P05, P06, P07, P08, P09, P11, P12, P13, P14, O01, O02, O04, O06, O13 en Android) |
| Casos fallidos | 0 |
| Casos bloqueados | 0 |
| Casos aún pendientes | 39 (28 de iPhone; 11 de Android: P03, P10, O03, O05, O07, O08, O09, O10, O11, O12, O14) |

Actualizado el 25/11/2026. O07 y O10 pasaron de Fallido a Pendiente en la auditoría del 21/11 (no fallaron con la versión desplegada: faltaba la ruta de D08 y las capturas de O10 eran anteriores a la corrección de D05). O06 pasa de Fallido a Aprobado el 25/11: la lista de pacientes carga (24/11) y el historial de un paciente se abre completo (25/11); D04 no se repitió.

## Defectos encontrados

| ID defecto | Severidad | Caso (ID de la matriz) | Navegador | Resumen | Estado |
| --- | --- | --- | --- | --- | --- |
| DISP02-D01 | Media | DISP02-P06-AND | Chrome Android | El historial de citas del paciente es una tabla de 6 columnas: en el teléfono solo se ven 3; precio, estado y acciones quedan fuera y las filas tienen huecos grandes. | Corregido en `disp02-fixes.patch` (tarjetas en celular). Desplegado (PR #28); verificado en el teléfono el 20/11 (3.ª ronda, P06-R2-AND) |
| DISP02-D02 | Media | DISP02-P12-AND | Chrome Android | Al recargar Mi panel con sesión activa aparece «Inicia sesión como paciente» hasta que el navegador lee la sesión. | Corregido en `disp02-fixes.patch` («Cargando tu sesión…» en panel, perfil y configuración). Desplegado; verificado en el teléfono el 20/11 (3.ª ronda, P12-A/B-R2-AND) |
| DISP02-D03 | Media | DISP02-O03-AND | Chrome Android | El menú de la cuenta del odontólogo se abre a la derecha del menú lateral y corta «Configuración» y «Cerrar sesión». | Corregido en `disp02-fixes.patch` (se abre hacia arriba en celular). Desplegado; falta la captura del menú de la cuenta en el teléfono (O03) |
| DISP02-D04 | Alta | DISP02-O06-AND, DISP02-O07-AND | Chrome Android | En producción fallan `GET /api/odontologos/yo/pacientes`, `GET /api/pacientes/{id}` y `GET /api/odontologos/yo/historias?paciente_id=` (O06-B). El código del backend de esos endpoints es correcto y no se pudo llamar a producción desde el entorno de revisión, así que la causa en el servidor no está confirmada. | Cerrado (25/11). `disp02-fixes-r2.patch` muestra el motivo con el código HTTP en pantalla. El 24 y 25/11 la lista de pacientes y el historial cargaron bien en Chrome Android (O06-R4-AND-A a E) y el error no se repitió. La causa del fallo del 20/11 no quedó identificada |
| DISP02-D05 | Media | DISP02-O10-AND | Chrome Android | En horizontal (pantalla baja) el pie del menú lateral del odontólogo tapa los enlaces: «Notificaciones» queda encima de «Consultorio» y los de abajo no se alcanzan. | Corregido en `disp02-fixes-r2.patch` (el menú se desplaza; el pie va debajo). Reproducido y verificado a 805×300, 384×700 y 1280×800. Desplegado (PR #28); falta repetir O10 en el teléfono |
| DISP02-D06 | Baja | DISP02-P06-AND | Chrome Android | En «Próximas citas» cada tarjeta tiene dos botones para cancelar: «Cancelar» (confirmación del navegador, sin aviso de reembolso) y «Cancelar cita» (con el aviso). | Corregido en `disp02-fixes-r2.patch`: queda solo «Cancelar cita». Desplegado; verificado en el teléfono (3.ª ronda, P06-R2-AND) |
| DISP02-D08 | Alta | DISP02-O07-AND | Chrome Android | Diferencia con la app: en la app, una cita atendida lleva a la ficha del paciente con sus historias y las citas atendidas sin historia (hasta ≈ 1 año atrás) para registrarlas. En la web la ficha solo listaba historias, la agenda no enlazaba a la ficha y solo carga 14 días atrás: una cita atendida más antigua no se podía documentar. | Corregido en `disp02-fixes-r3.patch`: «Historia clínica» en las citas atendidas de la agenda y sección «Citas atendidas sin historia clínica» con «Registrar historia» en la ficha, con los mismos endpoints y cálculo que la app. Verificado con backend simulado a 384 px. Desplegado (PR #29); falta repetir O07 en el teléfono |
| DISP02-D07 | Alta | DISP02-O07-AND | Chrome Android | La agenda oculta «Registrar historia» cuando falla la consulta de historias (D04), así que no se puede abrir el formulario ni pulsar Cancelar. | Corregido en `disp02-fixes-r2.patch`: se ofrece igual y el backend evita el duplicado con 409, que el diálogo ya muestra como «ya existía». Verificado con backend simulado a 384 px. Desplegado (PR #28); falta repetir O07 en el teléfono |

La revisión estática del código (menú, `h-screen`, diálogos, chatbot de 560 px, `grid-cols-7` en la vista mes, ausencia de `safe-area`) está descrita en `PROTOCOLO_DISP02.md`. Esos puntos **no son defectos confirmados** hasta que un caso de la matriz falle.

## Evidencias

| Caso | Archivo o enlace | Notas (sin secretos) |
| --- | --- | --- |
| P04, P14 | `evidencias/P14.jpeg` | Mi panel con próximas citas |
| P06 | `evidencias/P06.jpeg` | Defecto DISP02-D01 (renombrar desde `´P06.jpeg`) |
| P08 | `evidencias/P08.jpeg` | Modal de términos |
| P09 | `evidencias/P09.jpeg` | Error de credenciales |
| P11 | `evidencias/P11.jpeg` | Catálogo en vertical |
| P12 | `evidencias/P12-A.jpeg`, `evidencias/P12-B.jpeg` | Defecto DISP02-D02 |
| P13 | `evidencias/P13.jpeg` | Panel de notificaciones |
| O03 | `evidencias/O03.jpeg` | Defecto DISP02-D03 (captura recortada) |
| O06 | `evidencias/O06-A.jpeg`, `evidencias/O06-B.jpeg` | Defecto DISP02-D04 (captura recortada) |
| P01 | `evidencias/P01.jpeg` | 2.ª ronda: Mi panel tras iniciar sesión |
| P02 | `evidencias/P02.jpeg` | 2.ª ronda: Mi perfil (reemplaza la captura con contraseña) |
| P03 | `evidencias/P03.jpeg` | 2.ª ronda: menú abierto; falta la navegación |
| P05 | `evidencias/P05.jpeg` | 2.ª ronda: agenda con sesión de paciente |
| P06 | `evidencias/P06-r2.jpeg` | 2.ª ronda: Próximas citas, defecto D06 (renombrar para no pisar la de la 1.ª ronda) |
| P12 | `evidencias/P12-A-r2.jpeg`, `evidencias/P12-B-r2.jpeg` | 2.ª ronda: D02 reproducido otra vez |
| O10 | `evidencias/O10.jpeg`, `evidencias/O10-B.jpeg` | Defecto DISP02-D05 en horizontal |
| P06, P07, P12, P14 | `evidencias/P06-R2-AND.jpeg`, `P07-AND.jpeg`, `P12-A-R2-AND.jpeg`, `P12-B-R2-AND.jpeg`, `P14-AND.jpeg`, `P14-AND-CORREO.jpeg` | 3.ª ronda: D01, D02 y D06 verificados en el teléfono |
| P03, P10 | `evidencias/P03_N.jpeg`, `evidencias/P10-A-AND.jpeg` | 3.ª ronda: incompletos |
| O06 | `evidencias/O06-R4-AND-A.jpeg` a `evidencias/O06-R4-AND-E.jpeg` | 4.ª ronda (24 y 25/11): lista de pacientes e historial de Nadia Chávez; D04 no se repite |
| O01, O02, O03, O04, O12, O13 | `evidencias/O01-AND.jpeg`, `O02-AND.jpeg`, `O03-R2-AND.jpeg`, `O04-AND.jpeg`, `O12-A-AND.jpeg`, `O13-DIA-AND.jpeg`, `O13-SEMANA-AND.jpeg`, `O13-MES-AND.jpeg` | 3.ª ronda |

El `P02.jpeg` de la 1.ª ronda no se guarda: muestra una contraseña en texto plano. El `P02.jpeg` de la 2.ª ronda sí es válido. `O12.jpeg` (1.ª ronda) era una copia de `P01.jpeg`. `P07.jpeg` (2.ª ronda) no corresponde al caso y no se guarda. En la 3.ª ronda hay archivos repetidos que no se cuentan dos veces: `O11-AND` = `O01-AND`, `O14-AND` = `P06-R2-AND`, `O12-B-AND` = `P12-B-R2-AND`, `P10-B-AND` = `P12-A-R2-AND`, y `O10-A-AND`/`O10-B-AND` son las capturas de la 2.ª ronda.

O05, O08 y O09 tienen además una verificación automatizada con backend simulado (Chromium a 384 px). Sirve para confirmar la lógica, **no** reemplaza la ejecución en el teléfono.

## Conclusión

Redactar solo al cerrar la matriz. Mientras haya filas Pendiente o Bloqueado:

> DISP-02 no está cerrado. La compatibilidad en Chrome para Android y Safari para iPhone no está aprobada.

Cuando todas las filas P01–P14 y O01–O14 de ambos navegadores estén Aprobado, la conclusión puede decir que esos casos pasaron en los dispositivos anotados arriba. No extender esa frase a otros navegadores ni a la app Capacitor.
