import * as React from "react";
import { motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, CreditCard, Mail, User, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

type EstadoApp = ReturnType<typeof useAppState>;

/** Rutas válidas a las que puede navegar una notificación. */
export type RutaNotificacion = "/paciente/panel" | "/paciente/catalogo" | "/dentist/agenda";

export type TipoNotificacion =
  | "cita_confirmada"
  | "cita_cancelada"
  | "cita_recordatorio"
  | "pago_aprobado"
  | "pago_rechazado"
  | "nueva_reserva"
  | "cancelacion_reserva"
  | "cambio_agenda"
  | "voucher_pendiente";

export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  ruta?: RutaNotificacion;
  icono: React.ElementType;
  color: string;
  labelTipo: string;
};

const ICONOS_TIPO: Record<TipoNotificacion, React.ElementType> = {
  cita_confirmada: CheckCircle2,
  cita_cancelada: X,
  cita_recordatorio: Clock,
  pago_aprobado: CreditCard,
  pago_rechazado: CreditCard,
  nueva_reserva: User,
  cancelacion_reserva: X,
  cambio_agenda: Clock,
  voucher_pendiente: Mail,
};

const COLORES_TIPO: Record<TipoNotificacion, string> = {
  cita_confirmada: "text-success-foreground bg-success/10 border-success/20",
  cita_cancelada: "text-destructive-foreground bg-destructive/10 border-destructive/20",
  cita_recordatorio: "text-warning-foreground bg-warning/10 border-warning/20",
  pago_aprobado: "text-success-foreground bg-success/10 border-success/20",
  pago_rechazado: "text-destructive-foreground bg-destructive/10 border-destructive/20",
  nueva_reserva: "text-primary-foreground bg-primary/10 border-primary/20",
  cancelacion_reserva: "text-destructive-foreground bg-destructive/10 border-destructive/20",
  cambio_agenda: "text-warning-foreground bg-warning/10 border-warning/20",
  voucher_pendiente: "text-primary-foreground bg-primary/10 border-primary/20",
};

const LABEL_TIPO: Record<TipoNotificacion, string> = {
  cita_confirmada: "Cita confirmada",
  cita_cancelada: "Cita cancelada",
  cita_recordatorio: "Recordatorio de cita",
  pago_aprobado: "Pago aprobado",
  pago_rechazado: "Pago rechazado",
  nueva_reserva: "Nueva reserva",
  cancelacion_reserva: "Reserva cancelada",
  cambio_agenda: "Cambio de agenda",
  voucher_pendiente: "Comprobante pendiente",
};

function construirNotificacionesPaciente(datos: {
  usuario: EstadoApp["usuario"];
  appointments: EstadoApp["appointments"];
  strikes: EstadoApp["strikes"];
}): Notificacion[] {
  const { usuario, appointments, strikes } = datos;
  const ahora = new Date();
  const lista: Notificacion[] = [];

  for (const cita of appointments) {
    const fechaCita = new Date(cita.date);
    const diasDiff = (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24);

    switch (cita.status) {
      case "CONFIRMED":
        lista.push({
          id: `cita-${cita.id}-confirmada`,
          tipo: "cita_confirmada",
          titulo: "Cita confirmada",
          descripcion: `Tu cita del ${cita.date} a las ${cita.time} ha sido confirmada.`,
          fecha: cita.date,
          leida: false,
          ruta: "/paciente/panel",
          color: COLORES_TIPO.cita_confirmada,
          labelTipo: LABEL_TIPO.cita_confirmada,
          icono: ICONOS_TIPO.cita_confirmada,
        });
        break;
      case "CANCELLED":
        lista.push({
          id: `cita-${cita.id}-cancelada`,
          tipo: "cita_cancelada",
          titulo: "Cita cancelada",
          descripcion: `Tu cita del ${cita.date} a las ${cita.time} ha sido cancelada.`,
          fecha: cita.date,
          leida: false,
          ruta: "/paciente/catalogo",
          color: COLORES_TIPO.cita_cancelada,
          labelTipo: LABEL_TIPO.cita_cancelada,
          icono: ICONOS_TIPO.cita_cancelada,
        });
        break;
      case "COMPLETED":
        lista.push({
          id: `cita-${cita.id}-completada`,
          tipo: "cita_confirmada",
          titulo: "Cita atendida",
          descripcion: `Tu cita del ${cita.date} ha sido atendida.`,
          fecha: cita.date,
          leida: false,
          ruta: "/paciente/panel",
          color: COLORES_TIPO.cita_confirmada,
          labelTipo: LABEL_TIPO.cita_confirmada,
          icono: ICONOS_TIPO.cita_confirmada,
        });
        break;
      case "PAYMENT_REJECTED":
        lista.push({
          id: `pago-${cita.id}-rechazado`,
          tipo: "pago_rechazado",
          titulo: "Pago rechazado",
          descripcion: `El comprobante de tu cita del ${cita.date} fue rechazado.`,
          fecha: cita.date,
          leida: false,
          ruta: "/paciente/panel",
          color: COLORES_TIPO.pago_rechazado,
          labelTipo: LABEL_TIPO.pago_rechazado,
          icono: ICONOS_TIPO.pago_rechazado,
        });
        break;
      case "VERIFYING":
        lista.push({
          id: `pago-${cita.id}-verificando`,
          tipo: "pago_aprobado",
          titulo: "Pago en revisión",
          descripcion: `Tu comprobante para la cita del ${cita.date} está siendo verificado.`,
          fecha: cita.date,
          leida: false,
          ruta: "/paciente/panel",
          color: COLORES_TIPO.pago_aprobado,
          labelTipo: LABEL_TIPO.pago_aprobado,
          icono: ICONOS_TIPO.pago_aprobado,
        });
        break;
    }

    if (cita.status === "CONFIRMED" && diasDiff > 0 && diasDiff <= 2) {
      lista.push({
        id: `recordatorio-${cita.id}`,
        tipo: "cita_recordatorio",
        titulo: "Recordatorio de cita",
        descripcion: `Mañana tienes una cita a las ${cita.time}.`,
        fecha: cita.date,
        leida: false,
        ruta: "/paciente/panel",
        color: COLORES_TIPO.cita_recordatorio,
        labelTipo: LABEL_TIPO.cita_recordatorio,
        icono: ICONOS_TIPO.cita_recordatorio,
      });
    }
  }

  if (strikes > 0) {
    lista.push({
      id: `strike-${usuario?.nombre}`,
      tipo: "cita_cancelada",
      titulo: "Inasistencia registrada",
      descripcion: "Tienes una inasistencia registrada en tus citas.",
      fecha: new Date().toISOString().split("T")[0]!,
      leida: false,
      ruta: "/paciente/panel",
      color: COLORES_TIPO.cita_cancelada,
      labelTipo: LABEL_TIPO.cita_cancelada,
      icono: ICONOS_TIPO.cita_cancelada,
    });
  }

  return lista;
}

function construirNotificacionesOdontologo(datos: {
  agenda: EstadoApp["agenda"];
  vouchersPorRevisar: EstadoApp["vouchersPorRevisar"];
}): Notificacion[] {
  const { agenda, vouchersPorRevisar } = datos;
  const lista: Notificacion[] = [];

  for (const cita of agenda) {
    switch (cita.status) {
      case "PENDING_PAYMENT":
        lista.push({
          id: `reserva-${cita.id}-pendiente`,
          tipo: "nueva_reserva",
          titulo: "Nueva reserva pendiente",
          descripcion: `${cita.patient} ha solicitado una cita para el ${cita.date} a las ${cita.time}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          color: COLORES_TIPO.nueva_reserva,
          labelTipo: LABEL_TIPO.nueva_reserva,
          icono: ICONOS_TIPO.nueva_reserva,
        });
        break;
      case "CANCELLED":
        lista.push({
          id: `reserva-${cita.id}-cancelada`,
          tipo: "cancelacion_reserva",
          titulo: "Reserva cancelada",
          descripcion: `${cita.patient} canceló su cita del ${cita.date} a las ${cita.time}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          color: COLORES_TIPO.cancelacion_reserva,
          labelTipo: LABEL_TIPO.cancelacion_reserva,
          icono: ICONOS_TIPO.cancelacion_reserva,
        });
        break;
    }
  }

  for (const voucher of vouchersPorRevisar) {
    if (voucher.voucher?.status === "EN_REVISION") {
      lista.push({
        id: `voucher-${voucher.id}`,
        tipo: "voucher_pendiente",
        titulo: "Comprobante pendiente",
        descripcion: `${voucher.patient} subió un comprobante para revisar.`,
        fecha: voucher.voucher.uploadedAt ?? new Date().toISOString().split("T")[0]!,
        leida: false,
        ruta: "/dentist/agenda",
        color: COLORES_TIPO.voucher_pendiente,
        labelTipo: LABEL_TIPO.voucher_pendiente,
        icono: ICONOS_TIPO.voucher_pendiente,
      });
    }
  }

  for (const cita of agenda) {
    if (cita.status === "COMPLETED") {
      lista.push({
        id: `atendida-${cita.id}`,
        tipo: "cita_confirmada",
        titulo: "Cita atendida",
        descripcion: `La cita de ${cita.patient} del ${cita.date} fue marcada como atendida.`,
        fecha: cita.date,
        leida: false,
        ruta: "/dentist/agenda",
        color: COLORES_TIPO.cita_confirmada,
        labelTipo: LABEL_TIPO.cita_confirmada,
        icono: ICONOS_TIPO.cita_confirmada,
      });
    }
  }

  return lista;
}

function formatoFechaRelativa(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  if (fecha.toDateString() === hoy.toDateString()) {
    return fecha.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (fecha.toDateString() === ayer.toDateString()) {
    return "Ayer";
  }
  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

interface NotificacionesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificacionesPanel({ open, onOpenChange }: NotificacionesPanelProps) {
  const navigate = useNavigate();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { usuario, appointments, agenda, vouchersPorRevisar, strikes } = useAppState();
  const esOdontologo = usuario?.rol === "ODONTOLOGO";

  const [leidas, setLeidas] = React.useState<ReadonlySet<string>>(() => new Set<string>());

  const notificaciones = React.useMemo(
    () =>
      esOdontologo
        ? construirNotificacionesOdontologo({ agenda, vouchersPorRevisar })
        : construirNotificacionesPaciente({ usuario, appointments, strikes }),
    [esOdontologo, agenda, vouchersPorRevisar, usuario, appointments, strikes],
  );

  const noLeidas = notificaciones.filter((n) => !leidas.has(n.id)).length;

  const marcarTodasLeidas = () => {
    setLeidas(new Set(notificaciones.map((n) => n.id)));
  };

  const marcarLeida = (id: string) => {
    setLeidas((prev) => {
      const siguiente = new Set(prev);
      siguiente.add(id);
      return siguiente;
    });
  };

  const navegarARuta = (ruta?: RutaNotificacion) => {
    if (!ruta) return;
    navigate({ to: ruta });
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (!open) return;
    const manejarClicFuera = (e: MouseEvent) => {
      const panel = panelRef.current;
      if (panel && !panel.contains(e.target as Node)) onOpenChange(false);
    };
    const manejarEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", manejarClicFuera);
    document.addEventListener("keydown", manejarEscape);
    return () => {
      document.removeEventListener("mousedown", manejarClicFuera);
      document.removeEventListener("keydown", manejarEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="fixed top-16 right-4 z-50 w-80 md:w-96 max-h-[85vh] flex flex-col rounded-2xl border border-border/80 bg-white shadow-lg shadow-brand-deep/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-foreground">Notificaciones</h2>
        </div>
        {noLeidas > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={marcarTodasLeidas}
            className="text-xs px-2 py-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        {notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Bell className="size-8 mb-3 text-border" />
            <h3 className="font-medium text-foreground">Sin notificaciones</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No tienes notificaciones nuevas por ahora.
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-border/60">
              {notificaciones.map((notif) => {
                const Icon = notif.icono;
                const esLeida = leidas.has(notif.id);
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      marcarLeida(notif.id);
                      navegarARuta(notif.ruta);
                    }}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-colors hover:bg-muted/50",
                      !esLeida
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    <div className="flex shrink-0 items-center justify-center p-1.5 rounded-lg">
                      <Icon className={cn("size-4", notif.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium leading-tight",
                          !esLeida ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {notif.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {notif.descripcion}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p
                        className={cn(
                          "text-xs font-semibold leading-none",
                          !esLeida ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {formatoFechaRelativa(notif.fecha)}
                      </p>
                      {!esLeida && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-primary bg-primary/10">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0",
                        !esLeida ? "text-primary/40" : "text-border",
                      )}
                    />
                  </motion.div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate({
                    to: esOdontologo ? "/dentist/agenda" : "/paciente/panel",
                  });
                }}
                className="w-full text-xs py-2 text-muted-foreground hover:text-primary"
              >
                Ver todas las notificaciones <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
