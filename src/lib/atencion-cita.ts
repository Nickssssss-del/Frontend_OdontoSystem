import { statusLabel, type Appointment, type AppointmentStatus } from "@/lib/app-state-types";

export type AccionesAtencion = {
  atender: boolean;
  inasistencia: boolean;
  registrarHistoria: boolean;
};

/**
 * Una cita CONFIRMADA solo se atiende o se marca inasistencia cuando su inicio ya llegó.
 * COMPLETADA abre el registro de historia (una vez). Canceladas, futuras e inasistencias no cambian.
 */
export function accionesDeCita(input: {
  status: AppointmentStatus;
  inicioIso: string;
  ahoraMs: number;
  historiaRegistrada: boolean;
  historiaCerrada: boolean;
  /** false mientras no haya una consulta exitosa que diga si la cita ya tiene historia. */
  puedeComprobarHistoria: boolean;
}): AccionesAtencion {
  const inicioMs = Date.parse(input.inicioIso);
  const horaAlcanzada = Number.isFinite(inicioMs) && inicioMs <= input.ahoraMs;
  const confirmadaVencida = input.status === "CONFIRMED" && horaAlcanzada;
  return {
    atender: confirmadaVencida,
    inasistencia: confirmadaVencida,
    registrarHistoria:
      input.status === "COMPLETED" &&
      input.puedeComprobarHistoria &&
      !input.historiaRegistrada &&
      !input.historiaCerrada,
  };
}

/** El aviso usa la etiqueta del estado que devolvió el backend, no un texto fijo. */
export function mensajeTransicion(
  estado: AppointmentStatus,
  paciente: string,
): { titulo: string; descripcion: string } {
  const etiqueta = statusLabel[estado];
  return {
    titulo: `Cita actualizada: ${etiqueta}`,
    descripcion: `La cita de ${paciente} quedó en estado ${etiqueta}.`,
  };
}

/** Si dejó de ser elegible, no se envía el PATCH. Si ya hay una solicitud, no se duplica. */
export function decisionInasistencia(input: {
  elegible: boolean;
  bloqueada: boolean;
}): "enviar" | "cerrar" | "esperar" {
  if (!input.elegible) return "cerrar";
  if (input.bloqueada) return "esperar";
  return "enviar";
}

export type DecisionEnvioHistoria =
  | { tipo: "validacion"; errores: ErroresHistoria }
  | { tipo: "duplicado" }
  | { tipo: "enviar"; cuerpo: { diagnostico: string; tratamiento: string; notas?: string } };

/** No arma un POST si faltan datos o si ya hay un envío en curso. */
export function decidirEnvioHistoria(input: {
  diagnostico: string;
  tratamiento: string;
  notas?: string;
  enviando: boolean;
}): DecisionEnvioHistoria {
  if (input.enviando) return { tipo: "duplicado" };
  const preparado = cuerpoHistoria(input.diagnostico, input.tratamiento, input.notas);
  if (!preparado.ok) return { tipo: "validacion", errores: preparado.errores };
  return { tipo: "enviar", cuerpo: preparado.cuerpo };
}

export type EfectoRespuestaHistoria = {
  mostrarComoRegistrada: boolean;
  cerrar: boolean;
  puedeReintentar: boolean;
};

/** 409 no se presenta como un guardado nuevo. Un error deja el formulario abierto. */
export function efectoRespuestaHistoria(codigo: "ok" | 409 | "error"): EfectoRespuestaHistoria {
  if (codigo === "ok") {
    return { mostrarComoRegistrada: true, cerrar: true, puedeReintentar: false };
  }
  if (codigo === 409) {
    return { mostrarComoRegistrada: false, cerrar: true, puedeReintentar: false };
  }
  return { mostrarComoRegistrada: false, cerrar: false, puedeReintentar: true };
}

/** null conserva el estado visible: un fallo de red no debe simular la transición. */
export function estadoTrasOperacion(
  actual: AppointmentStatus,
  siguiente: AppointmentStatus | null,
): AppointmentStatus {
  return siguiente ?? actual;
}

/** Si la respuesta falló, la lista queda igual. Si llegó la cita, solo se reemplaza ese id. */
export function fusionarCita(
  lista: readonly Appointment[],
  actualizada: Appointment | null,
  id: string,
): Appointment[] {
  if (!actualizada || actualizada.id !== id) return [...lista];
  return lista.map((cita) => {
    if (cita.id !== id) return cita;
    return {
      ...cita,
      ...actualizada,
      patient: actualizada.patient || cita.patient,
      patientId: actualizada.patientId ?? cita.patientId,
      patientPhone: actualizada.patientPhone ?? cita.patientPhone,
      patientEmail: actualizada.patientEmail ?? cita.patientEmail,
    };
  });
}

/** true solo la primera vez: el segundo clic sobre la misma cita no dispara otra solicitud. */
export function reservarOperacion(enCurso: Set<string>, citaId: string): boolean {
  if (enCurso.has(citaId)) return false;
  enCurso.add(citaId);
  return true;
}

export function liberarOperacion(enCurso: Set<string>, citaId: string): void {
  enCurso.delete(citaId);
}

/** Tope de HistoriaRequest (@Size max = 4000) en POST /api/citas/{id}/historia. */
export const MAX_TEXTO_HISTORIA = 4000;

export type ErroresHistoria = { diagnostico?: string; tratamiento?: string; notas?: string };

function errorDeLargo(valor: string, mensaje: string): string | undefined {
  return valor.trim().length > MAX_TEXTO_HISTORIA ? mensaje : undefined;
}

export function erroresHistoria(
  diagnostico: string,
  tratamiento: string,
  notas?: string,
): ErroresHistoria | null {
  const errores: ErroresHistoria = {};
  if (!diagnostico.trim()) errores.diagnostico = "El diagnóstico es obligatorio.";
  else {
    const largo = errorDeLargo(diagnostico, "El diagnóstico no puede superar los 4000 caracteres.");
    if (largo) errores.diagnostico = largo;
  }
  if (!tratamiento.trim()) errores.tratamiento = "El tratamiento es obligatorio.";
  else {
    const largo = errorDeLargo(tratamiento, "El tratamiento no puede superar los 4000 caracteres.");
    if (largo) errores.tratamiento = largo;
  }
  if (notas?.trim()) {
    const largo = errorDeLargo(notas, "Las notas no pueden superar los 4000 caracteres.");
    if (largo) errores.notas = largo;
  }
  return errores.diagnostico || errores.tratamiento || errores.notas ? errores : null;
}

/** Cuerpo de POST /api/citas/{id}/historia. notas solo si el odontólogo escribió algo. */
export function cuerpoHistoria(
  diagnostico: string,
  tratamiento: string,
  notas?: string,
):
  | { ok: false; errores: ErroresHistoria }
  | { ok: true; cuerpo: { diagnostico: string; tratamiento: string; notas?: string } } {
  const diagnosticoLimpio = diagnostico.trim();
  const tratamientoLimpio = tratamiento.trim();
  const notasLimpias = notas?.trim();
  const errores = erroresHistoria(diagnosticoLimpio, tratamientoLimpio, notasLimpias);
  if (errores) return { ok: false, errores };
  return {
    ok: true,
    cuerpo: {
      diagnostico: diagnosticoLimpio,
      tratamiento: tratamientoLimpio,
      ...(notasLimpias ? { notas: notasLimpias } : {}),
    },
  };
}

/** La interfaz solo marca la historia como guardada cuando el POST respondió bien. */
export function historiaQuedoRegistrada(exito: boolean): boolean {
  return exito;
}
