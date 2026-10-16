/**
 * Resumen de actividad del paciente dentro de «Mi perfil»: KPIs de citas,
 * próximas citas, historial de atenciones y calificaciones pendientes.
 * Todos los datos salen del backend (citas, historias clínicas, reseñas y
 * reputación); si un endpoint falla se muestra el error en su tarjeta sin
 * sustituirlo por datos ficticios.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  ShieldAlert,
  Star,
} from "lucide-react";
import {
  AvisoError,
  claseEstadoCita,
  etiquetaEstadoCita,
  KpiPerfil,
  mensajeDeError,
  ResumenSkeleton,
} from "@/components/perfil/PerfilComunes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  citasApi,
  historiasApi,
  resenasApi,
  usuariosApi,
  type Cita,
  type CitaPorResenar,
  type EstadoCita,
  type HistoriaClinica,
  type ReputacionPaciente,
} from "@/lib/api";
import { fechaDe, fechaLarga, horaDe } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

const CITAS_ACTIVAS: EstadoCita[] = ["PENDIENTE_PAGO", "PENDIENTE_CONFIRMACION", "CONFIRMADA"];

export function ResumenPaciente() {
  const [citas, setCitas] = React.useState<Cita[]>([]);
  const [porResenar, setPorResenar] = React.useState<CitaPorResenar[]>([]);
  const [historias, setHistorias] = React.useState<HistoriaClinica[]>([]);
  const [reputacion, setReputacion] = React.useState<ReputacionPaciente | null>(null);
  const [errorCitas, setErrorCitas] = React.useState<string | null>(null);
  const [errorHistorias, setErrorHistorias] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCitas(null);
    setErrorHistorias(null);
    (async () => {
      const [rCitas, rResenas, rHistorias, rReputacion] = await Promise.allSettled([
        citasApi.mias(),
        resenasApi.porResenar(),
        historiasApi.mias(),
        usuariosApi.reputacion(),
      ]);
      if (!vigente) return;
      if (rCitas.status === "fulfilled") {
        setCitas(rCitas.value);
      } else {
        setCitas([]);
        setErrorCitas(mensajeDeError(rCitas.reason, "No se pudieron cargar tus citas."));
      }
      if (rResenas.status === "fulfilled") setPorResenar(rResenas.value);
      else setPorResenar([]);
      if (rHistorias.status === "fulfilled") setHistorias(rHistorias.value);
      else {
        setHistorias([]);
        setErrorHistorias(
          mensajeDeError(rHistorias.reason, "No se pudo cargar tu historial de atenciones."),
        );
      }
      setReputacion(rReputacion.status === "fulfilled" ? rReputacion.value : null);
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [intento]);

  if (cargando) return <ResumenSkeleton />;

  const ahora = Date.now();
  const proximas = citas
    .filter((c) => CITAS_ACTIVAS.includes(c.estado) && new Date(c.fin).getTime() > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const atendidas = citas.filter((c) => c.estado === "COMPLETADA").length;
  const reintentar = () => setIntento((i) => i + 1);

  return (
    <div className="space-y-6">
      {/* KPIs del resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiPerfil
          label="Próximas citas"
          valor={errorCitas ? "—" : proximas.length}
          icono={<Calendar className="size-5" />}
          tono="accent"
        />
        <KpiPerfil
          label="Citas atendidas"
          valor={errorCitas ? "—" : atendidas}
          icono={<CheckCircle2 className="size-5" />}
          tono="success"
        />
        <KpiPerfil
          label="Por calificar"
          valor={porResenar.length}
          icono={<Star className="size-5" />}
          tono="primary"
        />
        <KpiPerfil
          label="Strikes de puntualidad"
          valor={reputacion ? `${reputacion.strikes}/${reputacion.limite_strikes}` : "—"}
          icono={<ShieldAlert className="size-5" />}
          tono={
            reputacion && reputacion.strikes > 0 ? "destructive" : "success"
          }
        />
      </div>

      {errorCitas && <AvisoError mensaje={errorCitas} onReintentar={reintentar} />}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas citas */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <CalendarClock className="size-5 text-primary" /> Próximas citas
              </CardTitle>
              <CardDescription>Tus reservas activas con odontólogos.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
              <Link to="/paciente/panel">
                Ver panel <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorCitas && proximas.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No tienes citas programadas.{" "}
                <Link
                  to="/paciente/catalogo"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Busca un dentista
                </Link>{" "}
                para reservar.
              </p>
            )}
            {proximas.slice(0, 4).map((cita) => (
              <div
                key={cita.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{cita.servicio.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    con {cita.odontologo.nombre} · {fechaLarga(fechaDe(cita.inicio))} ·{" "}
                    {horaDe(cita.inicio)}
                  </p>
                </div>
                <Badge className={cn("shrink-0", claseEstadoCita[cita.estado])}>
                  {etiquetaEstadoCita[cita.estado]}
                </Badge>
              </div>
            ))}
            {proximas.length > 4 && (
              <p className="text-xs text-muted-foreground">
                Y {proximas.length - 4} citas más en tu panel.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Calificaciones pendientes */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Star className="size-5 text-primary" /> Calificaciones pendientes
              </CardTitle>
              <CardDescription>Atenciones terminadas que aún no has puntuado.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
              <Link to="/paciente/panel">
                Calificar <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {porResenar.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No tienes citas pendientes de calificar. ¡Buen trabajo!
              </p>
            ) : (
              porResenar.slice(0, 4).map((pendiente) => (
                <div
                  key={pendiente.cita_id}
                  className="rounded-xl border border-border/70 bg-background p-4"
                >
                  <p className="text-sm font-semibold">{pendiente.servicio}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    con {pendiente.odontologo} · {fechaLarga(fechaDe(pendiente.atendida_el))}
                  </p>
                </div>
              ))
            )}
            {porResenar.length > 4 && (
              <p className="text-xs text-muted-foreground">
                Y {porResenar.length - 4} atenciones más por calificar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* FIN_RESUMEN */}

    </div>
  );
}
