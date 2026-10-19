/**
 * Devuelve el rango de fechas válido para la agenda del odontólogo.
 * - `desde`: fecha de hoy (inclusive) en formato YYYY-MM-DD
 * - `hasta`: fecha de hoy + 62 días (exclusivo) en formato YYYY-MM-DD
 * El backend acepta un máximo de 62 días y trata la fecha `hasta` como exclusiva.
 */
export function obtenerRangoAgendaValida() {
  const hoy = new Date();
  const desde = fechaLima(0); // YYYY-MM-DD (inclusive)
  const hasta = fechaLima(62); // YYYY-MM-DD (exclusive)
  
  return { desde, hasta };
}