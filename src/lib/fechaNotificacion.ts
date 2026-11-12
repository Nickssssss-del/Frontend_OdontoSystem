/**
 * Fecha de una notificación según el día de calendario en Lima (DEF-04).
 *  - mismo día que hoy → hora («14:05»)
 *  - día anterior      → «Ayer»
 *  - cualquier otro    → fecha corta («9 nov.»; con año si no es el actual)
 *
 * Compara fechas de calendario, no la diferencia en milisegundos: con
 * Math.floor sobre días, un aviso de hace minutos daba −1 y salía como «Ayer».
 */
const ZONA = "America/Lima";

const diaCalendario = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const formatoHora = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const formatoCorto = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
});
const formatoCortoConAnio = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** 'AAAA-MM-DD' del día anterior a otro 'AAAA-MM-DD'. */
function diaAnterior(dia: string): string {
  const [a = 0, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
}

export function fechaRelativaNotificacion(fechaISO: string, ahora: Date = new Date()): string {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return "Sin datos";

  const dia = diaCalendario.format(fecha);
  const hoy = diaCalendario.format(ahora);
  if (dia === hoy) return formatoHora.format(fecha);
  if (dia === diaAnterior(hoy)) return "Ayer";
  return dia.slice(0, 4) === hoy.slice(0, 4)
    ? formatoCorto.format(fecha)
    : formatoCortoConAnio.format(fecha);
}
