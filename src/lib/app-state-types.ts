// Tipos y constantes compartidas para el estado global de la app
import type { EstadoCita, Rol } from "@/lib/api";
import { fechaDe, horaDe } from "@/lib/odontologos";

export type UserRole = "patient" | "dentist";

/** Usuario con sesión iniciada en el backend (null = nadie inició sesión). */
export type Usuario = { nombre: string; rol: Rol };

export type AppointmentStatus =
  | "PENDING_PAYMENT"
  | "VERIFYING"
  | "PAYMENT_REJECTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type VoucherStatus = "EN_REVISION" | "APROBADO" | "RECHAZADO";

export type Voucher = {
  method: "yape" | "plin";
  reference: string;
  amount: number;
  uploadedAt: string;
  imageUrl?: string | undefined;
  status: VoucherStatus;
  reason?: string | undefined;
  attempt: number;
};

export type Appointment = {
  id: string;
  dentistId: string;
  patient: string;
  patientId?: string | undefined;
  patientPhone?: string | undefined;
  patientEmail?: string | undefined;
  date: string;
  time: string;
  service: string;
  amount: number;
  status: AppointmentStatus;
  note?: string;
  voucher?: Voucher;
};

/** Estados del backend (EstadoCita) → estados de la interfaz. */
export const ESTADO_UI: Record<EstadoCita, AppointmentStatus> = {
  PENDIENTE_PAGO: "PENDING_PAYMENT",
  PENDIENTE_CONFIRMACION: "VERIFYING", // pagada; espera que el odontólogo la confirme
  CONFIRMADA: "CONFIRMED",
  COMPLETADA: "COMPLETED",
  CANCELADA_CON_REEMBOLSO: "CANCELLED",
  CANCELADA_SIN_REEMBOLSO: "CANCELLED",
  INASISTENCIA_PENALIZADA: "NO_SHOW",
  REPROGRAMADA: "CANCELLED",
};

export const statusLabel: Record<AppointmentStatus, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  VERIFYING: "Verificando pago",
  PAYMENT_REJECTED: "Comprobante rechazado",
  CONFIRMED: "Confirmada",
  COMPLETED: "Atendida",
  CANCELLED: "Cancelada",
  NO_SHOW: "Inasistencia",
};

export const statusClass: Record<AppointmentStatus, string> = {
  PENDING_PAYMENT: "bg-muted text-muted-foreground border-border",
  VERIFYING: "bg-warning/15 text-warning-foreground border-warning/40",
  PAYMENT_REJECTED: "bg-destructive/15 text-destructive border-destructive/40",
  CONFIRMED: "bg-primary/15 text-primary border-primary/30",
  COMPLETED: "bg-success/15 text-success-foreground border-success/40",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-destructive/15 text-destructive border-destructive/30",
};

export const voucherLabel: Record<VoucherStatus, string> = {
  EN_REVISION: "En revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export const voucherClass: Record<VoucherStatus, string> = {
  EN_REVISION: "bg-warning/15 text-warning-foreground border-warning/40",
  APROBADO: "bg-success/15 text-success-foreground border-success/40",
  RECHAZADO: "bg-destructive/15 text-destructive border-destructive/40",
};

export const motivosRechazo = [
  "La imagen está borrosa o incompleta",
  "El monto no coincide con el anticipo",
  "El número de operación no aparece en la cuenta",
  "El comprobante corresponde a otra fecha",
];

export const STRIKE_LIMIT = 3;

/** Cita del backend (/api/citas/mias o /api/odontologos/yo/citas) → Appointment de la interfaz. */
export function citaAAppointment(
  c: {
    id: string;
    odontologo: { id: string };
    paciente?: { nombre: string; id: string; telefono?: string | null; correo?: string | null };
    motivo_cancelacion?: string | null;
    inicio: string;
    servicio: { titulo: string };
    precio: number | string;
    estado: EstadoCita;
  },
  pacientePorDefecto = "",
): Appointment {
  const paciente = "paciente" in c ? c.paciente : undefined;
  const nota = "motivo_cancelacion" in c ? c.motivo_cancelacion : null;
  return {
    id: c.id,
    dentistId: c.odontologo.id,
    patient: paciente?.nombre ?? pacientePorDefecto,
    patientId: paciente?.id,
    patientPhone: paciente?.telefono ?? undefined,
    patientEmail: paciente?.correo ?? undefined,
    date: fechaDe(c.inicio),
    time: horaDe(c.inicio),
    service: c.servicio.titulo,
    amount: Number(c.precio),
    status: ESTADO_UI[c.estado] ?? "PENDING_PAYMENT",
    ...(nota ? { note: nota } : {}),
  };
}
