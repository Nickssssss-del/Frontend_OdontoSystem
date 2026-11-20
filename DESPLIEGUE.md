# Despliegue del portal web OdontoSystem

Documento de operación del frontend en este repositorio (`Frontend_OdontoSystem`). Describe lo que está en el código y en los archivos de configuración. Donde el proveedor o un comando no se pudo comprobar, queda marcado como **pendiente de confirmar**.

No contiene secretos. Los ejemplos usan placeholders.

## 1. Objetivo y alcance

Objetivo: dejar por escrito cómo se instala, se construye y se publica el portal web, y qué parte de la aplicación Android existe fuera de este repositorio.

Alcance de este documento:

- Portal web: React 19, TanStack Start, Vite y Nitro.
- Conexión con la API REST (Spring Boot).
- Lo que este repositorio declara sobre Vercel.
- La app Android, que **no está en este repositorio**.

Fuera de alcance:

- Desplegar o cambiar el backend.
- Publicar en el proveedor desde esta revisión. No se ejecutó ningún despliegue.
- Generar un APK. No se ejecutó Gradle ni Capacitor.

## 2. Arquitectura general del despliegue

```text
Navegador
  -> portal web (este repositorio)
      -> src/lib/api.ts  (fetch + Authorization: Bearer)
          -> API REST
```

Hechos comprobados en el repositorio:

| Pieza | Dónde se ve | Qué hace |
| --- | --- | --- |
| Interfaz | `package.json`, `src/routes/` | React 19 y rutas por archivo de TanStack Router. |
| Servidor de la app | `vite.config.ts`, `src/server.ts` | TanStack Start. El entry de servidor es `src/server.ts`. |
| Empaquetado | `package.json` script `build` = `vite build`; `vite.config.ts` `nitro.preset` | Vite + Nitro. El preset explícito es `vercel` y la salida es `.vercel/output`. El wrapper de Lovable sigue usando Cloudflare solo dentro de su sandbox (`LOVABLE_SANDBOX=1`). |
| Cabeceras en Vercel | `vercel.json` y `nitro.routeRules` | Mismas tres cabeceras. Nitro no copia `headers` de `vercel.json` al `config.json` del artefacto; `routeRules` sí las escribe ahí. |
| URL pública declarada | `README.md` | `https://frontend-odonto-system.vercel.app`. El README dice que Vercel publica la rama `main` automáticamente. |
| API | `src/lib/api.ts`, `src/server.ts` | `VITE_API_URL`. Si no está definida, el código usa `https://odontosystem-production.up.railway.app`. |

**Verificado con `npm run build` el 16/11/2026, después de fijar `nitro.preset: "vercel"`:** Nitro imprimió `preset: vercel`, runtime `nodejs22.x` y entry `web`. Generó `.vercel/output` (`config.json` versión 3, función `__server.func`, estáticos en `static`). No se desplegó.

Sin `nitro.preset`, el mismo wrapper deja `defaultPreset: "cloudflare-module"`. Dentro del sandbox de Lovable el wrapper vuelve a forzar Cloudflare e ignora este preset.

## 3. Requisitos previos y versiones verificadas

Comprobado en la máquina donde se redactó este documento:

| Herramienta | Versión observada |
| --- | --- |
| Node.js | v22.23.3 |
| npm | 10.9.9 |

El `package.json` no declara `engines`. Esa versión de Node es la del entorno local, no un requisito fijado por el repositorio.

Versiones declaradas en `package.json` (no se volvieron a instalar durante esta redacción):

| Paquete | Versión en package.json |
| --- | --- |
| react / react-dom | ^19.2.0 |
| typescript | ^5.8.3 |
| vite | 8.1.7 |
| @tanstack/react-router | 1.170.41 |
| @tanstack/react-start | 1.168.60 |
| nitro | 3.0.260603-beta |
| vitest | ^3.2.4 |

`package-lock.json` existe (`lockfileVersion` 3). La instalación reproducible es `npm ci` cuando el lock está presente. **Pendiente de confirmar** en CI: este repositorio no incluye un workflow de GitHub Actions.

## 4. Instalación de dependencias

Desde la raíz de este repositorio:

```bash
npm ci
```

`npm install` también está documentado en el README. `npm ci` usa el lockfile y es el comando adecuado cuando `package-lock.json` está completo.

## 5. Configuración de variables de entorno

El código lee variables `VITE_*` con `import.meta.env`. Vite las incorpora en el build. Cambiarlas en el proveedor exige **volver a construir**.

No hay `.env` ni `.env.example` en la raíz. `src/lib/api.ts` menciona `.env.example`, pero ese archivo no está en el repositorio.

| Variable | Obligatoria | Dónde se usa | Si falta |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `src/lib/api.ts`, `src/server.ts` (origen de `connect-src` en la CSP de producción) | Se usa `https://odontosystem-production.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | No para correo y contraseña | `src/components/GoogleBoton.tsx` | El botón de Google indica que falta la variable y el ingreso por correo sigue disponible |

Ejemplo local, sin valores reales:

```bash
# archivo .env en la raíz, no se commitea
VITE_API_URL=https://ejemplo-api.example
VITE_GOOGLE_CLIENT_ID=<client-id-web>
```

`VITE_GOOGLE_CLIENT_ID` es el Client ID web. El comentario del componente indica que debe coincidir con el Client ID que el backend espera. No pegar el secreto de cliente de Google: el flujo web usa el ID público, no el client secret.

Otras claves (Mercado Pago, Cloudinary, base de datos) no se leen en este frontend. La CSP de `src/server.ts` permite orígenes fijos de Google, Mercado Pago, Cloudinary y OpenStreetMap.

## 6. Configuración de la URL del backend

1. Definir `VITE_API_URL` sin barra final. El código recorta las barras finales.
2. La URL tiene que ser un origen absoluto válido: `src/server.ts` hace `new URL(...)` para armar la CSP.
3. El backend debe aceptar el origen del portal en CORS. Esa lista está en el backend, no en este repositorio. **Pendiente de confirmar** en el entorno publicado.
4. Las peticiones autenticadas envían `Authorization: Bearer` con el access token guardado en `localStorage` bajo la clave `odontosystem.sesion`. Si responde 401, el cliente llama una vez a `POST /api/auth/refresh`.

## 7. Ejecución local

Script real: `"dev": "vite dev"`.

```bash
npm run dev
```

El README indica `http://localhost:5173`. **Pendiente de confirmar en esta revisión:** no se arrancó el servidor de desarrollo al escribir este documento, así que el puerto no se volvió a observar.

Comandos que sí existen en `package.json`:

| Script | Comando | Uso |
| --- | --- | --- |
| `dev` | `vite dev` | Desarrollo |
| `build` | `vite build` | Producción |
| `build:dev` | `vite build --mode development` | Build en modo development |
| `preview` | `vite preview` | Servir el resultado del build |
| `lint` | `eslint .` | Lint |
| `test` | `vitest run` | Pruebas unitarias |
| `typecheck` | `tsc --noEmit` | Tipos |
| `format` | `prettier --write .` | Formato. Reescribe archivos. No usarlo como paso de verificación. |

## 8. Construcción de producción

```bash
npm run build
```

Salida verificada: `.vercel/output`. El log también menciona `npx vite preview` y `npx nitro deploy --prebuilt`. Ese deploy **no se ejecutó**. El `nitro.json` del artefacto indica `npx vercel deploy --prebuilt` como comando de publicación; tampoco se ejecutó. No está en `package.json`.

Vista previa local, después de un build:

```bash
npm run preview
```

## 9. Despliegue web

### Plataforma declarada

Vercel, según `README.md`:

- URL: `https://frontend-odonto-system.vercel.app`
- Publicación automática de `main` al integrar el pull request.

**Pendiente de confirmar:** el panel de Vercel (proyecto, rama de producción, comando de build y variables). No se consultó el panel ni se hizo deploy.

### Configuración que sí está en el repositorio

`vercel.json` añade cabeceras a `/(.*)`. No fija `buildCommand`, `outputDirectory` ni framework. No hace falta añadirlos: con el preset `vercel`, Vercel reconoce `.vercel/output` después de `npm run build`. Las cabeceras de ese archivo no entran solas en el artefacto; `vite.config.ts` las repite en `nitro.routeRules`.

### Comandos exactos que existen aquí

Construcción:

```bash
npm ci
npm run build
```

No hay `npm run deploy` ni dependencia `vercel` en `package.json`. Un comando `vercel` o `npx vercel` **no está definido por este repositorio**.

### Variables en el proveedor

Configurar en el entorno de build, no solo en runtime, porque Vite las incrusta:

- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID` si se quiere el ingreso con Google

No colocar client secrets, contraseñas de base de datos ni tokens de servicio en variables `VITE_*`: quedan en el bundle del navegador.

### Verificación posterior

Lista para ejecutar a mano después de un despliegue real. **No se ejecutó contra producción en esta revisión.**

1. Abrir la URL publicada y comprobar que carga el ingreso (`/`).
2. Iniciar sesión con una cuenta de prueba. Un 401 o un fallo de red indican URL de API o CORS.
3. En las herramientas de red, confirmar que las llamadas van al origen de `VITE_API_URL` y que no aparece el token en la URL.
4. Recargar la página y comprobar que la sesión sigue (clave `odontosystem.sesion`).
5. Abrir una ruta de paciente (`/paciente/catalogo`) y una de odontólogo (`/dentist/dashboard`) con el rol correspondiente.

## 10. Aplicación móvil

La app Android **no está en este repositorio**. El README enlaza el repositorio `APPFRONTENDODONTO`. En esta máquina el código está en el directorio hermano `c:\GitHub\APPFRONTENDODONTO`.

Lo siguiente se leyó de ese otro proyecto. No se instaló, no se sincronizó y no se generó un APK.

### Qué hay en el repo móvil

| Hecho | Fuente |
| --- | --- |
| Capacitor 8.5.3 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) | `package.json` |
| `appId` `com.odontosystem.app`, `appName` `OdontoSystem`, `webDir` `dist` | `capacitor.config.ts` |
| `CapacitorHttp.enabled: true` | `capacitor.config.ts` |
| `minSdkVersion` 24, `compileSdkVersion` 36, `targetSdkVersion` 36 | `android/variables.gradle` |
| Android Gradle Plugin 8.13.0 | `android/build.gradle` |
| `versionName` `1.0`, `versionCode` 1 | `android/app/build.gradle` |
| El tipo `release` no define `signingConfig` | `android/app/build.gradle` |
| Scripts npm | `dev`, `build`, `lint`, `preview`, `typecheck`, `test`. No hay script `cap` ni `apk`. |

El README de la app dice que empaquetar para Google Play es un paso siguiente. Una auditoría de ese repo (`AUDITORIA_INTEGRAL_FRONTEND_MOVIL.md`) indica que `npx cap sync` y `assembleDebug` no se lanzaron.

Un comentario en `src/lib/push.ts` de la app menciona, como condición para push:

```bash
npm run build && npx cap sync android
```

Ese comando está escrito en el código de la app. **No se ejecutó aquí** y no es un script de `package.json`.

La app móvil usa su propio `VITE_API_URL`. Si no está definido, `src/api/http.ts` de la app usa `http://localhost:8080`, distinto del fallback de Railway del portal web.

### Sincronización, APK, instalación

**Pendiente de confirmar con el equipo de la app.** En el código revisado no hay:

- script npm que genere el APK;
- configuración de firma (`signingConfig` / keystore);
- procedimiento de instalación escrito en el README de la app.

No se inventan comandos de `gradlew assembleRelease` ni de Android Studio como procedimiento oficial.

## 11. Consideraciones de seguridad

- No commitear `.env`. Hoy no hay `.env` en la raíz de este repo.
- No documentar ni pegar access tokens, refresh tokens, client secrets ni el contenido de `google-services.json` de la app.
- `VITE_*` es público en el navegador.
- La CSP de producción se aplica en `src/server.ts` solo cuando `import.meta.env.PROD` es verdadero. En desarrollo no se aplica, para no bloquear el HMR.
- `vercel.json` envía `Cross-Origin-Opener-Policy: same-origin-allow-popups` (el ingreso con Google abre una ventana).
- El rol lo vuelve a validar el backend. Ocultar un botón en la interfaz no sustituye ese control.
- La sesión vive en `localStorage`. Quien tenga acceso al navegador puede leerla.

## 12. Solución de errores frecuentes

| Síntoma | Qué comprobar | Estado |
| --- | --- | --- |
| El portal llama a Railway aunque se quería otro API | `VITE_API_URL` ausente en el **build**. El fallback está en `src/lib/api.ts`. | Verificado en código |
| Google no aparece o muestra que falta el Client ID | `VITE_GOOGLE_CLIENT_ID` vacío. El correo y la contraseña no dependen de esa variable. | Verificado en código |
| 401 en cada llamada | Token ausente o vencido, y el refresh no pudo renovar. El cliente cierra la sesión si el token renovado también recibe 401. | Verificado en código |
| La página carga y la API falla por CORS | Origen del portal no permitido en el backend. | Pendiente de confirmar en el backend publicado |
| El build vuelve a generar un Worker de Cloudflare | Falta `nitro.preset: "vercel"` o el build corrió con `LOVABLE_SANDBOX=1`. El artefacto correcto es `.vercel/output`, no `.output`. | Verificado en código y en el build local |
| `src/server.ts` no arranca la CSP porque `VITE_API_URL` no es una URL | `new URL(...)` lanza si el valor no es absoluto. | Verificado en código |

## 13. Rollback

No hay procedimiento de rollback en este repositorio (ni script, ni documentación de un despliegue anterior, ni identificador de release).

**Pendiente de confirmar:** si el proyecto de Vercel permite volver a un deployment anterior desde su panel. No se comprobó.

Hasta que el equipo lo confirme, el rollback no forma parte del procedimiento verificable de este repo.
