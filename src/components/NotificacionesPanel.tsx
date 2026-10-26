import * as React from "react";
import { motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, CreditCard, Mail, User, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent } from "@/components/ui/popover";

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
          icono: ICONOS_TIPO.cita_confirmada,
          color: "text-success-foreground",
          labelTipo: "Cita confirmada",
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
          ruta: "/paciente/panel",
          icono: ICONOS_TIPO.cita_cancelada,
          color: "text-destructive-foreground",
          labelTipo: "Cita cancelada",
        });
        break;
      case "PENDING_PAYMENT":
      case "VERIFYING":
      case "PAYMENT_REJECTED":
        if (diasDiff <= 1 && diasDiff >= 0) {
          lista.push({
            id: `cita-${cita.id}-recordatorio`,
            tipo: "cita_recordatorio",
            titulo: "Recordatorio de cita",
            descripcion: `Tienes una cita mañana ${cita.date} a las ${cita.time}.`,
            fecha: cita.date,
            leida: false,
            ruta: "/paciente/panel",
            icono: ICONOS_TIPO.cita_recordatorio,
            color: "text-warning-foreground",
            labelTipo: "Recordatorio de cita",
          });
        }
        break;
    }
  }

  // strikes is a number (count of pending vouchers)
  if (strikes > 0) {
    for (let i = 0; i < strikes; i++) {
      lista.push({
        id: `strike-${i}-voucher`,
        tipo: "voucher_pendiente",
        titulo: "Comprobante pendiente",
        descripcion: "Tienes un comprobante pendiente de subir.",
        fecha: new Date().toISOString(),
        leida: false,
        ruta: "/paciente/panel",
        icono: ICONOS_TIPO.voucher_pendiente,
        color: "text-primary-foreground",
        labelTipo: "Comprobante pendiente",
      });
    }
  }

  return lista.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function construirNotificacionesOdontologo(datos: {
  usuario: EstadoApp["usuario"];
  appointments: EstadoApp["appointments"];
}): Notificacion[] {
  const { appointments } = datos;
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
          descripcion: `Cita de ${cita.patient} confirmada para el ${cita.date} a las ${cita.time}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          icono: ICONOS_TIPO.cita_confirmada,
          color: "text-success-foreground",
          labelTipo: "Cita confirmada",
        });
        break;
      case "PENDING_PAYMENT":
      case "VERIFYING":
      case "PAYMENT_REJECTED":
        if (diasDiff <= 1 && diasDiff >= 0) {
          lista.push({
            id: `cita-${cita.id}-recordatorio`,
            tipo: "cita_recordatorio",
            titulo: "Próxima cita",
            descripcion: `Cita de ${cita.patient} mañana ${cita.date} a las ${cita.time}.`,
            fecha: cita.date,
            leida: false,
            ruta: "/dentist/agenda",
            icono: ICONOS_TIPO.cita_recordatorio,
            color: "text-warning-foreground",
            labelTipo: "Recordatorio de cita",
          });
        }
        lista.push({
          id: `cita-${cita.id}-nueva`,
          tipo: "nueva_reserva",
          titulo: "Nueva reserva",
          descripcion: `${cita.patient} ha solicitado una cita para el ${cita.date} a las ${cita.time}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          icono: ICONOS_TIPO.nueva_reserva,
          color: "text-primary-foreground",
          labelTipo: "Nueva reserva",
        });
        break;
      case "CANCELLED":
        lista.push({
          id: `cita-${cita.id}-cancelacion`,
          tipo: "cancelacion_reserva",
          titulo: "Reserva cancelada",
          descripcion: `${cita.patient} ha cancelado su cita del ${cita.date} a las ${cita.time}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          icono: ICONOS_TIPO.cancelacion_reserva,
          color: "text-destructive-foreground",
          labelTipo: "Reserva cancelada",
        });
        break;
      case "COMPLETED":
      case "NO_SHOW":
        lista.push({
          id: `cita-${cita.id}-cambio`,
          tipo: "cambio_agenda",
          titulo: "Agenda actualizada",
          descripcion: `Cita de ${cita.patient} completada el ${cita.date}.`,
          fecha: cita.date,
          leida: false,
          ruta: "/dentist/agenda",
          icono: ICONOS_TIPO.cambio_agenda,
          color: "text-warning-foreground",
          labelTipo: "Cambio de agenda",
        });
        break;
    }
  }

  return lista.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function formatoFechaRelativa(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = fecha.getTime() - ahora.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Mañana";
  if (diffDias === -1) return "Ayer";
  if (diffDias > 1 && diffDias <= 7) return `En ${diffDias} días`;
  if (diffDias < -1 && diffDias >= -7) return `Hace ${Math.abs(diffDias)} días`;

  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

interface NotificacionesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function NotificacionesPanel({
  open,
  onOpenChange,
  side = "right",
  align = "start",
  sideOffset = 4,
}: NotificacionesPanelProps) {
  const navigate = useNavigate();
  const { usuario, appointments, strikes } = useAppState();
  const esOdontologo = usuario?.rol === "ODONTOLOGO";

  const notificaciones = React.useMemo(() => {
    if (esOdontologo) {
      return construirNotificacionesOdontologo({ usuario, appointments });
    }
    return construirNotificacionesPaciente({ usuario, appointments, strikes });
  }, [esOdontologo, usuario, appointments, strikes]);

  const [leidas, setLeidas] = React.useState<Set<string>>(new Set());

  const noLeidas = notificaciones.filter((n) => !leidas.has(n.id)).length;

  const marcarLeida = (id: string) => {
    setLeidas((prev) => new Set(prev).add(id));
  };

  const marcarTodasLeidas = () => {
    setLeidas(new Set(notificaciones.map((n) => n.id)));
  };

  const navegarARuta = (ruta?: RutaNotificacion) => {
    if (!ruta) return;
    navigate({ to: ruta });
    onOpenChange(false);
  };

  const contenidoPanel = (
    <div className="w-[320px] sm:w-[380px] max-w-[calc(100vw-20px)] flex flex-col rounded-2xl border border-border/80 bg-popover shadow-lg shadow-brand-deep/10 backdrop-blur-sm overflow-hidden">
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
                          "text-sm font-medium leading-tight truncate",
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
    </div>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="p-0 w-auto max-w-none"
        alignOffset={-8}
      >
        {contenidoPanel}
      </PopoverContent>
    </Popover>
  );
}
