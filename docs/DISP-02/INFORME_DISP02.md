# Informe DISP-02 — plantilla

Este archivo es la plantilla del informe. **No declara compatibilidad aprobada.** Los totales están en cero porque ningún caso se ejecutó al crear el protocolo.

Completar una sección por cada dispositivo real. Copiar los conteos desde `MATRIZ_COMPATIBILIDAD.csv` después de ejecutar las filas. No rellenar «Aprobado» sin una fila ejecutada.

## Identificación

| Campo | Valor |
| --- | --- |
| Producto | Portal web OdontoSystem (este repositorio) |
| URL probada | |
| Commit o build | |
| Fecha del informe | |
| Quién ejecuta | |

## Dispositivos utilizados

| ID | Tipo | Marca y modelo | Sistema operativo | Navegador | Versión del navegador |
| --- | --- | --- | --- | --- | --- |
| D1 | Teléfono Android | | | Google Chrome | |
| D2 | iPhone | | | Safari | |

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
| Casos ejecutados | 0 |
| Casos aprobados | 0 |
| Casos fallidos | 0 |
| Casos bloqueados | 0 |
| Casos aún pendientes | 56 |

## Defectos encontrados

| ID defecto | Severidad | Caso (ID de la matriz) | Navegador | Resumen | Estado |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

La revisión estática del código (menú, `h-screen`, diálogos, chatbot de 560 px, `grid-cols-7` en la vista mes, ausencia de `safe-area`) está descrita en `PROTOCOLO_DISP02.md`. Esos puntos **no son defectos confirmados** hasta que un caso de la matriz falle.

## Evidencias

| Caso | Archivo o enlace | Notas (sin secretos) |
| --- | --- | --- |
| | | |

## Conclusión

Redactar solo al cerrar la matriz. Mientras haya filas Pendiente o Bloqueado:

> DISP-02 no está cerrado. La compatibilidad en Chrome para Android y Safari para iPhone no está aprobada.

Cuando todas las filas P01–P14 y O01–O14 de ambos navegadores estén Aprobado, la conclusión puede decir que esos casos pasaron en los dispositivos anotados arriba. No extender esa frase a otros navegadores ni a la app Capacitor.
