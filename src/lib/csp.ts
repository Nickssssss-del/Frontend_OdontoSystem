/**
 * Nonce de la CSP (MEJ-02 / SEC-07).
 *
 * TanStack Start hidrata la página con scripts en línea. En lugar de permitir cualquier script en
 * línea ('unsafe-inline'), el servidor genera un nonce aleatorio por cada petición, lo escribe en la
 * cabecera Content-Security-Policy y TanStack lo pone en sus propios scripts (opción `ssr.nonce` del
 * router). Un script inyectado por un atacante no conoce el nonce y el navegador lo bloquea.
 *
 * src/server.ts genera el nonce y lo pasa al render en esta cabecera interna de la petición
 * (cualquier valor que mande el navegador con el mismo nombre se reemplaza).
 */
export const CABECERA_NONCE = "x-odonto-csp-nonce";

/** 16 bytes aleatorios en base64: imposible de adivinar y válido dentro de 'nonce-…'. */
export function crearNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
