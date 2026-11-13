import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { CABECERA_NONCE, crearNonce } from "./lib/csp";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// Cabeceras de seguridad (OWASP ZAP, 05/11/2026): CSP, anti-clickjacking, nosniff,
// Referrer-Policy y Permissions-Policy en cada página que sirve el servidor.
// La CSP lista solo los servicios externos que usa la web: la API en Railway, Google
// (fuentes e inicio de sesión), Mercado Pago y los mapas de OpenStreetMap.
// Scripts en línea: solo los que llevan el nonce de la petición (MEJ-02; antes 'unsafe-inline').
// ---------------------------------------------------------------------------
const API_ORIGEN = new URL(
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
    "https://odontosystem-production.up.railway.app",
).origin;

const politicaCsp = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Imágenes: solo los orígenes que usa la web (antes «https:», cualquier sitio; ZAP 10055).
    // Fotos en Cloudinary, mosaicos de OpenStreetMap ({s} = a, b o c) e íconos de Mercado Pago.
    "img-src 'self' data: blob: https://res.cloudinary.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://*.mercadopago.com https://*.mlstatic.com",
    `connect-src 'self' ${API_ORIGEN} https://accounts.google.com https://*.mercadopago.com https://*.mercadolibre.com https://*.mlstatic.com`,
    "frame-src https://accounts.google.com https://*.mercadopago.com https://*.mercadolibre.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");

const CABECERAS_SEGURIDAD: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // La web usa la ubicación para «Mi ubicación»; cámara y micrófono no.
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(self)",
};

function conCabecerasDeSeguridad(response: Response, nonce: string): Response {
  // En desarrollo no se aplica la CSP: bloquearía la recarga en caliente de Vite.
  if (!import.meta.env.PROD) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", politicaCsp(nonce));
  for (const [nombre, valor] of Object.entries(CABECERAS_SEGURIDAD)) {
    if (!headers.has(nombre)) headers.set(nombre, valor);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Pasa el nonce al render (lo lee src/router.tsx). Solo en GET/HEAD, que son las peticiones que
 * devuelven páginas: así no se toca el cuerpo de los POST de las funciones del servidor.
 */
function conNonce(request: Request, nonce: string): Request {
  if (request.method !== "GET" && request.method !== "HEAD") return request;
  const headers = new Headers(request.headers);
  headers.set(CABECERA_NONCE, nonce);
  // GET y HEAD no llevan cuerpo: basta con copiar la URL, el método y las cabeceras.
  return new Request(request.url, { method: request.method, headers });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const nonce = crearNonce();
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(conNonce(request, nonce), env, ctx);
      return conCabecerasDeSeguridad(await normalizeCatastrophicSsrResponse(response), nonce);
    } catch (error) {
      console.error(error);
      return conCabecerasDeSeguridad(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    }
  },
};
