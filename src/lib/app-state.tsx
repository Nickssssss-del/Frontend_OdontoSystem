import * as React from "react";
import { toast } from "sonner";
import {
  agendaApi,
  alCambiarSesion,
  authApi,
  citasApi,
  horariosApi,
  leerSesion,
  miPerfilApi,
  usuariosApi,
  type Cita,
  type CitaOdontologo,
  type EstadoCita,
  type Rol,
} from "@/lib/api";
import { fechaDe, fechaLima, horaDe } from "@/lib/odontologos";

export type UserRole = "patient" | "dentist";

/** Usuario con sesión iniciada en el backend (null = nadie inició sesión). */
export type Usuario = { nombre: string; rol: Rol };

export type DocumentType = "DNI" | "Título" | "Colegiatura" | "CV";
export type DocumentStatus = "PENDIENTE" | "OBSERVADO" | "RECHAZADO" | "VERIFICADO";
export type Document = {
  type: DocumentType;
  estado: DocumentStatus;
  url?: string | undefined;
  motivoRechazo?: string | undefined;
};

const documentosIniciales: Document[] = [
  { type: "DNI", estado: "VERIFICADO" },
  { type: "Título", estado: "VERIFICADO" },
  { type: "Colegiatura", estado: "PENDIENTE" },
  { type: "CV", estado: "PENDIENTE" },
];

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
const ESTADO_UI: Record<EstadoCita, AppointmentStatus> = {
  PENDIENTE_PAGO: "PENDING_PAYMENT",
  PENDIENTE_CONFIRMACION: "VERIFYING", // pagada; espera que el odontólogo la confirme
  CONFIRMADA: "CONFIRMED",
  COMPLETADA: "COMPLETED",
  CANCELADA_CON_REEMBOLSO: "CANCELLED",
  CANCELADA_SIN_REEMBOLSO: "CANCELLED",
  INASISTENCIA_PENALIZADA: "NO_SHOW",
  REPROGRAMADA: "CANCELLED",
};

/** Cita del backend (/api/citas/mias o /api/odontologos/yo/citas) → Appointment de la interfaz. */
export function citaAAppointment(c: Cita | CitaOdontologo, pacientePorDefecto = ""): Appointment {
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

type Ctx = {
  usuario: Usuario | null;
  cerrarSesion: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  patient: string;
  strikes: number;
  isBanned: boolean;
  appointments: Appointment[];
  agenda: Appointment[];
  vouchersPorRevisar: Appointment[];
  /** Citas reales del backend; se refrescan solas (cada 60 s y al volver a la pestaña). */
  citasCargando: boolean;
  recargarCitas: () => Promise<void>;
  /** Acciones del odontólogo sobre una cita (llaman al backend y recargan la agenda). */
  confirmarCita: (id: string) => Promise<void>;
  completarCita: (id: string) => Promise<void>;
  marcarInasistencia: (id: string) => Promise<void>;
  /** El backend no maneja comprobantes manuales (pasarela simulada): aprobar = confirmar la cita. */
  approveVoucher: (id: string) => void;
  blockedToday: boolean;
  setBlockedToday: (v: boolean) => void;
  documentos: Document[];
  setDocumentos: React.Dispatch<React.SetStateAction<Document[]>>;
  frecuenciaDisponibilidad: string;
  setFrecuenciaDisponibilidad: (v: string) => void;
  bloqueoExpressActivo: boolean;
  setBloqueoExpressActivo: (v: boolean) => void;
  confirmacionManual: boolean;
  setConfirmacionManual: (v: boolean) => void;
};

const AppStateContext = React.createContext<Ctx | null>(null);

export const STRIKE_LIMIT = 3;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = React.useState<UserRole>("patient");
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);

  // La sesión vive en el navegador (ver src/lib/api.ts). Se lee al cargar y cada vez que cambia
  // (login, logout o token vencido), y el rol que manda el backend decide qué vista se muestra.
  React.useEffect(() => {
    const sincronizar = () => {
      const sesion = leerSesion();
      setUsuario(sesion ? { nombre: sesion.nombre_completo, rol: sesion.rol } : null);
      if (sesion) setUserRole(sesion.rol === "ODONTOLOGO" ? "dentist" : "patient");
    };
    sincronizar();
    return alCambiarSesion(sincronizar);
  }, []);
  const [strikes, setStrikes] = React.useState(0);
  const [puedeReservar, setPuedeReservar] = React.useState(true);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [agenda, setAgenda] = React.useState<Appointment[]>([]);
  const [citasCargando, setCitasCargando] = React.useState(false);
  const [blockedToday, setBlockedTodayEstado] = React.useState(false);
  const [documentos, setDocumentos] = React.useState<Document[]>(documentosIniciales);
  const [frecuenciaDisponibilidad, setFrecuenciaDisponibilidad] = React.useState(
    "Actualizo mi disponibilidad diariamente",
  );
  const [bloqueoExpressActivo, setBloqueoExpressActivo] = React.useState(false);
  const [confirmacionManual, setConfirmacionManual] = React.useState(false);

  const rol = usuario?.rol ?? null;
  const nombreUsuario = usuario?.nombre ?? "";

  /** Trae las citas reales del backend según el rol (paciente: /citas/mias; odontólogo: su agenda). */
  const recargarCitas = React.useCallback(async () => {
    if (!rol) {
      setAppointments([]);
      setAgenda([]);
      return;
    }
    try {
      if (rol === "ODONTOLOGO") {
        // El backend limita el rango de la agenda a 62 días (hasta es exclusivo): 14 atrás + 45 adelante.
        const [citas, bloqueos] = await Promise.all([
          miPerfilApi.citas(fechaLima(-14), fechaLima(45)),
          horariosApi.bloqueos().catch(() => []),
        ]);
        const lista = citas.map((c) => citaAAppointment(c));
        setAgenda(lista);
        setAppointments(lista);
        const ahora = Date.now();
        setBlockedTodayEstado(
          bloqueos.some((b) => Date.parse(b.inicio) <= ahora && ahora < Date.parse(b.fin)),
        );
      } else {
        const [citas, reputacion] = await Promise.all([
          citasApi.mias(),
          usuariosApi.reputacion().catch(() => null),
        ]);
        setAppointments(citas.map((c) => citaAAppointment(c, nombreUsuario)));
        setAgenda([]);
        if (reputacion) {
          setStrikes(reputacion.strikes);
          setPuedeReservar(reputacion.puede_reservar);
        }
      }
    } catch (e) {
      // Sin red o sesión vencida: se conserva lo último que se mostró.
      console.error("No se pudieron sincronizar las citas", e);
    }
  }, [rol, nombreUsuario]);

  // Sincronización entre dispositivos (web ↔ app): el backend es la fuente de verdad, así que
  // se recarga al iniciar sesión, cada 60 s y cuando la pestaña vuelve a primer plano.
  React.useEffect(() => {
    if (!rol) {
      setAppointments([]);
      setAgenda([]);
      setStrikes(0);
      setPuedeReservar(true);
      setBlockedTodayEstado(false);
      return;
    }
    let cancelado = false;
    const cargar = async () => {
      setCitasCargando(true);
      await recargarCitas();
      if (!cancelado) setCitasCargando(false);
    };
    void cargar();
    const timer = window.setInterval(() => void recargarCitas(), 60_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargarCitas();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [rol, recargarCitas]);

  const accionCita = React.useCallback(
    async (fn: () => Promise<unknown>, errorTexto: string) => {
      try {
        await fn();
        await recargarCitas();
      } catch (e) {
        toast.error(errorTexto, { description: e instanceof Error ? e.message : undefined });
        throw e;
      }
    },
    [recargarCitas],
  );

  /** Bloquea lo que queda de hoy (cancela con reembolso las citas) o quita el bloqueo vigente. */
  const setBlockedToday = React.useCallback(
    (bloquear: boolean) => {
      void (async () => {
        try {
          if (bloquear) {
            const ok =
              typeof window === "undefined" ||
              window.confirm(
                "Al bloquear hoy, las citas ya reservadas en lo que queda del día se cancelan con reembolso del 100 %. ¿Continuar?",
              );
            if (!ok) return;
            const finDelDia = new Date(`${fechaLima(0)}T23:59:59-05:00`).toISOString();
            await horariosApi.bloquear(new Date().toISOString(), finDelDia, "Bloqueo del día");
          } else {
            const ahora = Date.now();
            const vigentes = (await horariosApi.bloqueos()).filter(
              (b) => Date.parse(b.inicio) <= ahora && ahora < Date.parse(b.fin),
            );
            await Promise.all(vigentes.map((b) => horariosApi.quitarBloqueo(b.id)));
          }
          await recargarCitas();
        } catch (e) {
          toast.error("No se pudo actualizar el bloqueo", {
            description: e instanceof Error ? e.message : undefined,
          });
        }
      })();
    },
    [recargarCitas],
  );

  // El backend no tiene comprobantes manuales: nada por revisar.
  const vouchersPorRevisar = React.useMemo<Appointment[]>(() => [], []);

  const value: Ctx = {
    usuario,
    cerrarSesion: () => authApi.cerrarSesion(),
    userRole,
    setUserRole,
    patient: usuario?.nombre ?? "",
    strikes,
    isBanned: !puedeReservar,
    appointments,
    agenda,
    vouchersPorRevisar,
    citasCargando,
    recargarCitas,
    confirmarCita: (id) =>
      accionCita(() => agendaApi.confirmar(id), "No se pudo confirmar la cita"),
    completarCita: (id) =>
      accionCita(() => agendaApi.completar(id), "No se pudo marcar como atendida"),
    marcarInasistencia: (id) =>
      accionCita(() => agendaApi.inasistencia(id), "No se pudo registrar la inasistencia"),
    approveVoucher: (id) => {
      void accionCita(() => agendaApi.confirmar(id), "No se pudo confirmar la cita").catch(
        () => undefined,
      );
    },
    blockedToday,
    setBlockedToday,
    documentos,
    setDocumentos,
    frecuenciaDisponibilidad,
    setFrecuenciaDisponibilidad,
    bloqueoExpressActivo,
    setBloqueoExpressActivo,
    confirmacionManual,
    setConfirmacionManual,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = React.useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState debe usarse dentro de AppStateProvider");
  return ctx;
}
