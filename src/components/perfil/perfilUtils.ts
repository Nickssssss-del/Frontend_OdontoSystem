import { ApiError, type EstadoCita } from "@/lib/api";
import { fechaDe, rangoAgenda } from "@/lib/odontologos";

/** Mensaje legible de cualquier error de la API (sesión expirada incluida). */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.";
    }
    return error.message;
  }
  return porDefecto;
}

/** Etiquetas y estilos de estado de cita (mismo contrato que el panel). */
export const etiquetaEstadoCita: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "Pago pendiente",
  PENDIENTE_CONFIRMACION: "Esperando confirmación",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Atendida",
  CANCELADA_CON_REEMBOLSO: "Cancelada · depósito devuelto",
  CANCELADA_SIN_REEMBOLSO: "Cancelada",
  INASISTENCIA_PENALIZADA: "Inasistencia",
  REPROGRAMADA: "Reprogramada",
};

export const claseEstadoCita: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "border-border bg-muted text-muted-foreground",
  PENDIENTE_CONFIRMACION: "border-warning/40 bg-warning/15 text-warning-foreground",
  CONFIRMADA: "border-primary/30 bg-primary/10 text-primary",
  COMPLETADA: "border-success/30 bg-success/10 text-success",
  CANCELADA_CON_REEMBOLSO: "border-border bg-muted text-muted-foreground",
  CANCELADA_SIN_REEMBOLSO: "border-border bg-muted text-muted-foreground",
  INASISTENCIA_PENALIZADA: "border-destructive/30 bg-destructive/10 text-destructive",
  REPROGRAMADA: "border-border bg-muted text-muted-foreground",
};

/** Etiqueta corta del documento de identidad (sin inventar tipos). */
export function etiquetaDocumento(tipo: string | null | undefined): string {
  if (!tipo) return "Documento";
  if (tipo === "DNI") return "DNI";
  if (tipo === "CE" || tipo === "C.E.") return "C.E.";
  return tipo;
}

/** Fecha YYYY-MM-DD a partir de un ISO o de una fecha ya recortada. */
export function fechaPerfil(valor: string): string {
  return valor.length <= 10 ? valor : fechaDe(valor);
}

/**
 * Rango de agenda para GET /api/odontologos/yo/citas (`hasta` es exclusivo).
 * Misma ventana que usa app-state (14 días atrás + 45 adelante) y nunca supera los 62 días
 * que acepta el backend.
 */
export function rangoAgendaOdontologo(): { desde: string; hasta: string } {
  return rangoAgenda();
}
