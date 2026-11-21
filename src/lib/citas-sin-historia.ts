/**
 * Citas atendidas que todavía no tienen historia clínica (ficha del paciente del odontólogo).
 *
 * Espejo de la app móvil (`buscarCitasPendientesDeHistoria` en APPFRONTENDODONTO): la agenda solo carga 14 días
 * hacia atrás, así que una cita COMPLETADA más antigua no se podía documentar desde la web (DISP02-O07).
 * Se reutilizan los mismos endpoints que la app: GET /api/odontologos/yo/citas en tramos de 62 días.
 */
import type { CitaOdontologo } from "@/lib/api";
import { AGENDA_MAX_DIAS } from "@/lib/odontologos";

/** Tramos de 62 días que se revisan como máximo (≈ 1 año), igual que la app. */
export const MAX_TRAMOS_HISTORIA = 6;

const formatoLima = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sumarDias(fechaIso: string, dias: number): string {
  const [y = 1970, m = 1, d = 1] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Tramos válidos para el backend (≤ 62 días, `hasta` exclusivo, sin solaparse), desde mañana hacia atrás. */
export function tramosAgendaHaciaAtras(
  cantidad: number,
  ahoraMs = Date.now(),
): { desde: string; hasta: string }[] {
  const tramos: { desde: string; hasta: string }[] = [];
  let hasta = sumarDias(formatoLima.format(new Date(ahoraMs)), 1);
  for (let i = 0; i < cantidad; i++) {
    const desde = sumarDias(hasta, -AGENDA_MAX_DIAS);
    tramos.push({ desde, hasta });
    hasta = desde;
  }
  return tramos;
}

/**
 * Cuántas citas faltan documentar: atendidas (detalle del paciente) − historias registradas.
 * null si no se conoce alguno de los dos (detalle o historias fallaron).
 */
export function objetivoPendientes(
  citasAtendidas: number | null | undefined,
  historiasRegistradas: number | null,
): number | null {
  if (typeof citasAtendidas !== "number" || historiasRegistradas === null) return null;
  return Math.max(0, citasAtendidas - historiasRegistradas);
}

export type BusquedaSinHistoria = {
  /** COMPLETADAS del paciente, ya iniciadas, sin historia. Sin duplicados, la más reciente primero. */
  citas: CitaOdontologo[];
  /** Fecha más antigua revisada (YYYY-MM-DD). */
  revisadoDesde: string;
};

/**
 * Recorre la agenda hacia atrás hasta encontrar `objetivo` citas o agotar los tramos.
 * Con objetivo null (no se sabe cuántas faltan) solo revisa el primer tramo; con 0 no pide nada.
 */
export async function buscarCitasSinHistoria(
  pacienteId: string,
  opciones: {
    objetivo: number | null;
    conHistoria: ReadonlySet<string>;
    pedirAgenda: (desde: string, hasta: string) => Promise<CitaOdontologo[]>;
    ahoraMs?: number;
    maxTramos?: number;
  },
): Promise<BusquedaSinHistoria> {
  const { objetivo, conHistoria, pedirAgenda, ahoraMs = Date.now() } = opciones;
  const maxTramos = opciones.maxTramos ?? MAX_TRAMOS_HISTORIA;
  const tramos = tramosAgendaHaciaAtras(objetivo === null ? 1 : maxTramos, ahoraMs);
  const encontradas = new Map<string, CitaOdontologo>();
  let revisadoDesde = tramos[0]?.desde ?? "";
  for (const tramo of tramos) {
    if (objetivo !== null && encontradas.size >= objetivo) break;
    const citas = await pedirAgenda(tramo.desde, tramo.hasta);
    revisadoDesde = tramo.desde;
    for (const c of citas ?? []) {
      if (c.paciente?.id !== pacienteId || c.estado !== "COMPLETADA") continue;
      if (new Date(c.inicio).getTime() > ahoraMs || conHistoria.has(c.id)) continue;
      encontradas.set(c.id, c);
    }
  }
  const citas = [...encontradas.values()].sort((a, b) => b.inicio.localeCompare(a.inicio));
  return { citas, revisadoDesde };
}
