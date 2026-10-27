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
import { fechaDe, fechaLima, horaDe, rangoAgenda } from "@/lib/odontologos";
import {
  type Appointment,
  type AppointmentStatus,
  type Usuario,
  type UserRole,
  type Voucher,
  type VoucherStatus,
  citaAAppointment,
  ESTADO_UI,
  statusLabel,
  statusClass,
  voucherLabel,
  voucherClass,
  motivosRechazo,
  STRIKE_LIMIT,
} from "@/lib/app-state-types";

// Re-export types and constants for backward compatibility
export {
  type UserRole,
  type Usuario,
  type AppointmentStatus,
  type VoucherStatus,
  type Voucher,
  type Appointment,
  ESTADO_UI,
  citaAAppointment,
  statusLabel,
  statusClass,
  voucherLabel,
  voucherClass,
  motivosRechazo,
  STRIKE_LIMIT,
} from "@/lib/app-state-types";

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
};

const AppStateContext = React.createContext<Ctx | null>(null);

export { AppStateContext };

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
        const { desde, hasta } = rangoAgenda();
        // Cada parte falla por separado: si la agenda no carga, los bloqueos igual se actualizan.
        const [rCitas, rBloqueos] = await Promise.allSettled([
          miPerfilApi.citas(desde, hasta),
          horariosApi.bloqueos(),
        ]);
        if (rCitas.status === "fulfilled") {
          const lista = rCitas.value.map((c) => citaAAppointment(c));
          setAgenda(lista);
          setAppointments(lista);
        } else {
          console.error("No se pudo cargar la agenda", rCitas.reason);
        }
        const bloqueos = rBloqueos.status === "fulfilled" ? rBloqueos.value : [];
        const ahora = Date.now();
        setBlockedTodayEstado(
          bloqueos.some((b) => Date.parse(b.inicio) <= ahora && ahora < Date.parse(b.fin)),
        );
      } else {
        // Cada parte falla por separado: la reputación no depende de que carguen las citas.
        const [rCitas, rReputacion] = await Promise.allSettled([
          citasApi.mias(),
          usuariosApi.reputacion(),
        ]);
        if (rCitas.status === "fulfilled") {
          setAppointments(rCitas.value.map((c) => citaAAppointment(c, nombreUsuario)));
          setAgenda([]);
        } else {
          console.error("No se pudieron cargar las citas", rCitas.reason);
        }
        if (rReputacion.status === "fulfilled") {
          setStrikes(rReputacion.value.strikes);
          setPuedeReservar(rReputacion.value.puede_reservar);
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
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export { useAppState } from "./hooks/useAppState";
