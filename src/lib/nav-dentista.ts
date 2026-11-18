/** Rutas del menú del odontólogo. Ninguna apunta al módulo antiguo /odontologo. */
export const RUTAS_MENU_DENTISTA = [
  "/dentist/dashboard",
  "/dentist/agenda",
  "/dentist/pacientes",
  "/dentist/horarios",
  "/dentist/consultorio",
  "/dentist/liquidaciones",
  "/dentist/reclamos",
  "/dentist/perfil",
  "/dentist/configuracion",
] as const;

export type RutaMenuDentista = (typeof RUTAS_MENU_DENTISTA)[number];

export function menuSoloRutasDentist(rutas: readonly string[]): boolean {
  return rutas.every((ruta) => ruta.startsWith("/dentist/") && !ruta.includes("/odontologo"));
}

/**
 * /odontologo (con o sin barra final) pasa al dashboard nuevo.
 * /odontologo/configuracion no redirige: sigue siendo la pantalla de configuración hija.
 */
export function destinoLegacyOdontologo(pathname: string): "/dentist/dashboard" | null {
  const normal = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normal === "/odontologo" ? "/dentist/dashboard" : null;
}
