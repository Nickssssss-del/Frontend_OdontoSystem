/**
 * Fotos más livianas desde Cloudinary (OBS-11).
 *
 * Las fotos se suben en tamaño original (hay de 4000 × 6000 px y más de 2 MB) y la web
 * las muestra de 40 a 300 px. Cloudinary puede entregar una versión reducida si se agregan
 * transformaciones en la URL, justo después de `/image/upload/`:
 *   w_<ancho>  ancho máximo en píxeles
 *   c_limit    reduce sin recortar ni agrandar
 *   f_auto     el formato más liviano que acepte el navegador (WebP o AVIF)
 *   q_auto     calidad ajustada automáticamente
 *
 * Solo se cambian las URL públicas de Cloudinary (`/image/upload/`). Cualquier otra URL
 * (las privadas `/image/authenticated/`, las de otros sitios o un valor vacío) se devuelve tal cual.
 */

const PREFIJO_CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** Una transformación ya presente al inicio de la ruta, por ejemplo `w_400,c_fill/`. */
const YA_TRANSFORMADA = /^[a-z]{1,3}_[^/]*\//;

export function fotoOptimizada<T extends string | null | undefined>(url: T, ancho: number): T {
  if (!url) return url;
  const partes = PREFIJO_CLOUDINARY.exec(url);
  if (!partes) return url;
  const [, base, resto] = partes;
  if (!base || !resto || YA_TRANSFORMADA.test(resto)) return url;
  const anchoSeguro = Math.max(16, Math.min(2000, Math.round(ancho)));
  return `${base}w_${anchoSeguro},c_limit,f_auto,q_auto/${resto}` as T;
}

/** Anchos usados en la web: el doble del tamaño en pantalla, para pantallas de alta densidad. */
export const ANCHO_FOTO = {
  /** Miniaturas de 40 a 64 px (mapa, tarjetas y catálogo). */
  miniatura: 160,
  /** Foto de perfil de 80 a 96 px. */
  perfil: 200,
  /** Fotos del consultorio en la ficha del odontólogo (144 × 96 px). */
  galeria: 400,
  /** Fotos del consultorio en la cuadrícula del panel del odontólogo. */
  grande: 800,
} as const;
