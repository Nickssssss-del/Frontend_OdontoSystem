/**
 * Rango de agenda para GET /api/odontologos/yo/agenda-hoy
 * @returns { fecha: string; atiende: boolean | null; respondido_en: string | null; citas_hoy: number; primera_cita: string | null; citas_canceladas: number }
 * @returns AgendaHoy
 */
export function rangoAgendaOdontologo(): AgendaHoy {
  return obtenerRangoAgendaValida();
}