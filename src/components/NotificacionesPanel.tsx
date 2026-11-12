import * as React from "react";
import { motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageSquareWarning,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { usuariosApi, type NotificacionUsuario } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fechaRelativaNotificacion } from "@/lib/fechaNotificacion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/** Rutas válidas a las que puede navegar una notificación. */
export type RutaNotificacion =
  "/paciente/panel" | "/paciente/catalogo" | "/dentist/agenda" | "/dentist/reclamos";

/** Tipos que manda el backend en GET /api/usuarios/yo/notificaciones. */
export type TipoNotificacion =
  | "CONFIRMACION_PAGO"
  | "AVISO_CANCELACION"
  | "AVISO_REPROGRAMACION"
  | "RECORDATORIO_CITA"
  | "ALERTA_STRIKE"
  | "RECLAMO"
  | "AVISO";

export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  ruta?: RutaNotificacion | undefined;
  icono: React.ElementType;
  color: string;
  labelTipo: string;
};

const ICONOS_TIPO: Record<TipoNotificacion, React.ElementType> = {
  CONFIRMACION_PAGO: CheckCircle2,
  AVISO_CANCELACION: X,
  AVISO_REPROGRAMACION: Clock,
  RECORDATORIO_CITA: Clock,
  ALERTA_STRIKE: AlertTriangle,
  RECLAMO: MessageSquareWarning,
  AVISO: Bell,
};

const COLOR_TIPO: Record<TipoNotificacion, string> = {
  CONFIRMACION_PAGO: "text-success-foreground",
  AVISO_CANCELACION: "text-destructive-foreground",
  AVISO_REPROGRAMACION: "text-warning-foreground",
  RECORDATORIO_CITA: "text-warning-foreground",
  ALERTA_STRIKE: "text-destructive-foreground",
  RECLAMO: "text-primary",
  AVISO: "text-primary",
};

const LABEL_TIPO: Record<TipoNotificacion, string> = {
  CONFIRMACION_PAGO: "Cita",
  AVISO_CANCELACION: "Cita cancelada",
  AVISO_REPROGRAMACION: "Cita reprogramada",
  RECORDATORIO_CITA: "Recordatorio de cita",
  ALERTA_STRIKE: "Inasistencia",
  RECLAMO: "Reclamo",
  AVISO: "Aviso",
};

/** El backend puede sumar tipos nuevos: los que la web no conoce se muestran como aviso general. */
function tipoDe(tipo: string): TipoNotificacion {
  return tipo in ICONOS_TIPO ? (tipo as TipoNotificacion) : "AVISO";
}

/** A dónde lleva cada aviso: los de citas a la agenda o al panel, los reclamos a su sección. */
function rutaDe(tipo: TipoNotificacion, esOdontologo: boolean): RutaNotificacion | undefined {
  if (tipo === "RECLAMO") return esOdontologo ? "/dentist/reclamos" : undefined;
  if (tipo === "AVISO") return undefined;
  return esOdontologo ? "/dentist/agenda" : "/paciente/panel";
}

interface NotificacionesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}

export function NotificacionesPanel({
  open,
  onOpenChange,
  side = "right",
  align = "start",
  sideOffset = 4,
  children,
}: NotificacionesPanelProps) {
  const navigate = useNavigate();
  const { usuario } = useAppState();
  const esOdontologo = usuario?.rol === "ODONTOLOGO";
  /** null = cargando; "error" = la API no respondió. */
  const [desdeApi, setDesdeApi] = React.useState<NotificacionUsuario[] | "error" | null>(null);
  const [noLeidasApi, setNoLeidasApi] = React.useState(0);

  const cargar = React.useCallback(() => {
    if (!usuario) return () => {};
    let vivo = true;
    setDesdeApi(null);
    usuariosApi
      .notificaciones()
      .then((respuesta) => {
        if (!vivo) return;
        setDesdeApi(respuesta.notificaciones ?? []);
        setNoLeidasApi(respuesta.no_leidas ?? 0);
      })
      .catch(() => {
        if (vivo) setDesdeApi("error");
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

  // Se recarga al iniciar sesión y cada vez que se abre el panel, para ver los avisos nuevos.
  React.useEffect(() => cargar(), [cargar]);
  React.useEffect(() => (open ? cargar() : undefined), [open, cargar]);

  const lista = Array.isArray(desdeApi) ? desdeApi : [];
  const notificaciones = lista.map((aviso): Notificacion => {
    const tipo = tipoDe(aviso.tipo);
    return {
      id: aviso.id,
      tipo,
      titulo: aviso.titulo,
      descripcion: aviso.mensaje,
      fecha: aviso.creado_en,
      leida: aviso.leida,
      ruta: rutaDe(tipo, esOdontologo),
      icono: ICONOS_TIPO[tipo],
      color: COLOR_TIPO[tipo],
      labelTipo: LABEL_TIPO[tipo],
    };
  });
  const noLeidas = noLeidasApi;

  const marcarLeida = (id: string) => {
    if (!Array.isArray(desdeApi)) return;
    const previa = desdeApi;
    const previasNoLeidas = noLeidasApi;
    const aviso = previa.find((item) => item.id === id);
    if (!aviso || aviso.leida) return;
    setDesdeApi(previa.map((item) => (item.id === id ? { ...item, leida: true } : item)));
    setNoLeidasApi(Math.max(0, previasNoLeidas - 1));
    void usuariosApi.marcarNotificacionLeida(id).catch(() => {
      setDesdeApi(previa);
      setNoLeidasApi(previasNoLeidas);
    });
  };

  const marcarTodasLeidas = () => {
    if (!Array.isArray(desdeApi)) return;
    const previa = desdeApi;
    const previasNoLeidas = noLeidasApi;
    setDesdeApi(previa.map((aviso) => ({ ...aviso, leida: true })));
    setNoLeidasApi(0);
    void usuariosApi.marcarTodasLeidas().catch(() => {
      setDesdeApi(previa);
      setNoLeidasApi(previasNoLeidas);
    });
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
        {desdeApi === null ? (
          <p className="py-12 text-center text-sm text-muted-foreground" role="status">
            Cargando notificaciones…
          </p>
        ) : desdeApi === "error" ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            role="alert"
          >
            <Bell className="size-8 mb-3 text-border" />
            <h3 className="font-medium text-foreground">
              No se pudieron cargar las notificaciones
            </h3>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => cargar()}>
              Reintentar
            </Button>
          </div>
        ) : notificaciones.length === 0 ? (
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
                const esLeida = notif.leida;
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
                        {fechaRelativaNotificacion(notif.fecha)}
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
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
