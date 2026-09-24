import * as React from "react";

export type UserRole = "patient" | "dentist";

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
  date: string;
  time: string;
  service: string;
  amount: number;
  status: AppointmentStatus;
  note?: string;
  voucher?: Voucher;
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

const seed: Appointment[] = [
  {
    id: "a1",
    dentistId: "d1",
    patient: "Nicole Ramírez",
    date: "2026-08-04",
    time: "10:00",
    service: "Control mensual de brackets",
    amount: 80,
    status: "COMPLETED",
    note: "Cambio de ligas superiores. Buena higiene, se indica cepillo interdental.",
  },
  {
    id: "a2",
    dentistId: "d5",
    patient: "Nicole Ramírez",
    date: "2026-07-12",
    time: "16:00",
    service: "Destartraje",
    amount: 80,
    status: "COMPLETED",
    note: "Destartraje supragingival completo. Control en 6 meses.",
  },
  {
    id: "a3",
    dentistId: "d2",
    patient: "Nicole Ramírez",
    date: "2026-06-20",
    time: "09:00",
    service: "Diagnóstico de dolor",
    amount: 45,
    status: "NO_SHOW",
  },
  {
    id: "a4",
    dentistId: "d1",
    patient: "Nicole Ramírez",
    date: "2026-09-18",
    time: "11:00",
    service: "Control mensual de brackets",
    amount: 80,
    status: "CONFIRMED",
    voucher: {
      method: "yape",
      reference: "OP 8842190",
      amount: 20,
      uploadedAt: "12 Set, 18:42",
      status: "APROBADO",
      attempt: 1,
    },
  },
  {
    id: "a5",
    dentistId: "d4",
    patient: "Nicole Ramírez",
    date: "2026-09-22",
    time: "16:00",
    service: "Blanqueamiento láser",
    amount: 480,
    status: "VERIFYING",
    voucher: {
      method: "plin",
      reference: "OP 9013774",
      amount: 20,
      uploadedAt: "15 Set, 09:05",
      status: "EN_REVISION",
      attempt: 1,
    },
  },
];

const agendaHoy: Appointment[] = [
  {
    id: "h1",
    dentistId: "d1",
    patient: "Nicole Ramírez",
    date: "2026-09-15",
    time: "09:00",
    service: "Control de brackets",
    amount: 80,
    status: "CONFIRMED",
  },
  {
    id: "h2",
    dentistId: "d1",
    patient: "Marco Ayala",
    date: "2026-09-15",
    time: "10:00",
    service: "Evaluación ortodóncica",
    amount: 60,
    status: "VERIFYING",
    voucher: {
      method: "yape",
      reference: "OP 7712045",
      amount: 20,
      uploadedAt: "15 Set, 08:12",
      status: "EN_REVISION",
      attempt: 1,
    },
  },
  {
    id: "h3",
    dentistId: "d1",
    patient: "Lucía Tenorio",
    date: "2026-09-15",
    time: "11:00",
    service: "Instalación de brackets",
    amount: 950,
    status: "CONFIRMED",
  },
  {
    id: "h4",
    dentistId: "d1",
    patient: "Jorge Bermúdez",
    date: "2026-09-15",
    time: "12:00",
    service: "Control mensual",
    amount: 80,
    status: "PAYMENT_REJECTED",
    voucher: {
      method: "plin",
      reference: "OP 6620881",
      amount: 20,
      uploadedAt: "14 Set, 20:31",
      status: "RECHAZADO",
      reason: "La imagen está borrosa o incompleta",
      attempt: 1,
    },
  },
  {
    id: "h5",
    dentistId: "d1",
    patient: "Ana Peralta",
    date: "2026-09-15",
    time: "16:00",
    service: "Retiro de brackets",
    amount: 320,
    status: "CONFIRMED",
  },
  {
    id: "h6",
    dentistId: "d1",
    patient: "Diego Falcón",
    date: "2026-09-15",
    time: "17:00",
    service: "Evaluación",
    amount: 60,
    status: "COMPLETED",
  },
];

type Ctx = {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  patient: string;
  strikes: number;
  isBanned: boolean;
  appointments: Appointment[];
  agenda: Appointment[];
  vouchersPorRevisar: Appointment[];
  addStrike: () => void;
  clearStrikes: () => void;
  addAppointment: (a: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  updateAgenda: (id: string, patch: Partial<Appointment>) => void;
  approveVoucher: (id: string) => void;
  rejectVoucher: (id: string, reason: string) => void;
  resubmitVoucher: (id: string, data: { imageUrl?: string; reference: string; method: "yape" | "plin" }) => void;
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

const ahora = () =>
  new Date().toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = React.useState<UserRole>("patient");
  const [strikes, setStrikes] = React.useState(1);
  const [appointments, setAppointments] = React.useState<Appointment[]>(seed);
  const [agenda, setAgenda] = React.useState<Appointment[]>(agendaHoy);
  const [blockedToday, setBlockedToday] = React.useState(false);
  const [documentos, setDocumentos] = React.useState<Document[]>(documentosIniciales);
  const [frecuenciaDisponibilidad, setFrecuenciaDisponibilidad] = React.useState(
    "Actualizo mi disponibilidad diariamente"
  );
  const [bloqueoExpressActivo, setBloqueoExpressActivo] = React.useState(false);
  const [confirmacionManual, setConfirmacionManual] = React.useState(false);

  const patchBoth = (id: string, patch: (a: Appointment) => Partial<Appointment>) => {
    const apply = (prev: Appointment[]) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch(a) } : a));
    setAppointments(apply);
    setAgenda(apply);
  };

  const vouchersPorRevisar = React.useMemo(() => {
    const all = [...agenda, ...appointments].filter((a) => a.voucher);
    const seen = new Set<string>();
    return all
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((a, b) => {
        const rank = (v?: VoucherStatus) =>
          v === "EN_REVISION" ? 0 : v === "RECHAZADO" ? 1 : 2;
        return rank(a.voucher?.status) - rank(b.voucher?.status);
      });
  }, [agenda, appointments]);

  const value: Ctx = {
    userRole,
    setUserRole,
    patient: "Nicole Ramírez",
    strikes,
    isBanned: strikes >= STRIKE_LIMIT,
    appointments,
    agenda,
    vouchersPorRevisar,
    addStrike: () => setStrikes((s) => Math.min(STRIKE_LIMIT, s + 1)),
    clearStrikes: () => setStrikes(0),
    addAppointment: (a) => {
      setAppointments((prev) => [a, ...prev]);
      setAgenda((prev) => [...prev, a]);
    },
    updateAppointment: (id, patch) =>
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    updateAgenda: (id, patch) =>
      setAgenda((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    approveVoucher: (id) =>
      patchBoth(id, (a) => ({
        status: "CONFIRMED",
        ...(a.voucher
          ? { voucher: { ...a.voucher, status: "APROBADO" as const, reason: undefined } }
          : {}),
      })),
    rejectVoucher: (id, reason) =>
      patchBoth(id, (a) => ({
        status: "PAYMENT_REJECTED",
        ...(a.voucher
          ? { voucher: { ...a.voucher, status: "RECHAZADO" as const, reason } }
          : {}),
      })),
    resubmitVoucher: (id, data) =>
      patchBoth(id, (a) => ({
        status: "VERIFYING",
        voucher: {
          method: data.method,
          reference: data.reference,
          amount: a.voucher?.amount ?? 20,
          uploadedAt: ahora(),
          imageUrl: data.imageUrl,
          status: "EN_REVISION",
          attempt: (a.voucher?.attempt ?? 1) + 1,
        },
      })),
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
