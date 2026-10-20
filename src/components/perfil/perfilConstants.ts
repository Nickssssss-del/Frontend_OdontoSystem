import { ApiError, usuariosApi, type EstadoCita, type UsuarioYo } from "@/lib/api";
import { fechaDe, iniciales, rangoAgenda } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

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

/** Convierte una fecha ISO o recortada a YYYY-MM-DD. */
export function fechaPerfil(valor: string): string {
  return valor.length <= 10 ? valor : fechaDe(valor);
}

/** Rango de agenda para GET /api/odontologos/yo/citas. */
export function rangoAgendaOdontologo(): { desde: string; hasta: string } {
  return rangoAgenda();
}

/** Etiquetas de estado de cita. */
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

/** Clases CSS para estados de cita. */
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
