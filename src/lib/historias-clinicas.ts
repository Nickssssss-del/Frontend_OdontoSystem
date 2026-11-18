export type EstadoListaHistorias = "cargando" | "error" | "vacio" | "lista";

export function estadoListaHistorias(input: {
  cargando: boolean;
  error: string | null;
  total: number;
}): EstadoListaHistorias {
  if (input.cargando) return "cargando";
  if (input.error) return "error";
  if (input.total === 0) return "vacio";
  return "lista";
}

/**
 * Una lista vacía solo cuenta si el GET respondió bien.
 * Un error HTTP o de red no se convierte en «sin historias».
 */
export function clasificarConsultaHistorias<T>(
  resultado: { ok: true; historias: readonly T[] } | { ok: false },
): { estado: "vacio" | "lista"; historias: readonly T[] } | { estado: "error" } {
  if (!resultado.ok) return { estado: "error" };
  if (resultado.historias.length === 0) return { estado: "vacio", historias: [] };
  return { estado: "lista", historias: resultado.historias };
}

export type EstadoConsultaPaciente = "pendiente" | "ok" | "error";

/** La agenda no ofrece «Registrar historia» hasta una consulta exitosa de ese paciente. */
export function reducirConsultas(
  actual: Readonly<Record<string, EstadoConsultaPaciente>>,
  evento:
    | { tipo: "iniciar"; pacienteIds: readonly string[] }
    | { tipo: "exito"; pacienteId: string }
    | { tipo: "fallo"; pacienteId: string },
): Record<string, EstadoConsultaPaciente> {
  const siguiente = { ...actual };
  if (evento.tipo === "iniciar") {
    for (const pacienteId of evento.pacienteIds) siguiente[pacienteId] = "pendiente";
    return siguiente;
  }
  siguiente[evento.pacienteId] = evento.tipo === "exito" ? "ok" : "error";
  return siguiente;
}

/**
 * Solo el id que vino del backend. Un nombre (con espacios) o un valor vacío no se consulta.
 * Limitación: si la agenda no trae `paciente.id`, esa persona no abre el historial.
 */
export function idPacienteConsultable(id: string | null | undefined): string | null {
  const limpio = id?.trim() ?? "";
  if (!limpio || /\s/.test(limpio)) return null;
  return limpio;
}

export function agruparPacientesPorId<T extends { patientId?: string | undefined }>(
  citas: readonly T[],
): { porId: Map<string, T[]>; sinIdentificador: number } {
  const porId = new Map<string, T[]>();
  let sinIdentificador = 0;
  for (const cita of citas) {
    const id = idPacienteConsultable(cita.patientId);
    if (!id) {
      sinIdentificador += 1;
      continue;
    }
    const lista = porId.get(id) ?? [];
    lista.push(cita);
    porId.set(id, lista);
  }
  return { porId, sinIdentificador };
}

/**
 * Solo devuelve historias si la carga corresponde al paciente pedido.
 * Así un cambio de paciente no muestra el historial anterior.
 */
export function historiasDelPaciente<T>(
  cargadas: { pacienteId: string; historias: readonly T[] } | null,
  pacienteId: string,
): readonly T[] {
  if (!cargadas || cargadas.pacienteId !== pacienteId) return [];
  return cargadas.historias;
}

/** Fecha de atención en hora de Lima, sin correr el día cuando el backend manda solo YYYY-MM-DD. */
export function fechaAtencionVisible(valor: string): string {
  const iso = valor.includes("T") ? valor : `${valor}T12:00:00-05:00`;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}
