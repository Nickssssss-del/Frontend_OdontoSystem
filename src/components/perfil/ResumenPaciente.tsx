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
import { AvisoError, KpiPerfil, ResumenSkeleton } from "@/components/perfil/PerfilComunes";
import {
  claseEstadoCita,
  etiquetaEstadoCita,
  fechaPerfil,
  mensajeDeError,
} from "@/components/perfil";
import { StrikeMeter } from "@/components/StrikeMeter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAppState } from "@/lib/app-state";

type Atencion = {
  clave: string;
  servicio: string;
  odontologo: string;
  fecha: string;
  historia: HistoriaClinica | null;
};

const CITAS_ACTIVAS: EstadoCita[] = ["PENDIENTE_PAGO", "PENDIENTE_CONFIRMACION", "CONFIRMADA"];

export function ResumenPaciente() {
  const [citas, setCitas] = React.useState<Cita[]>([]);
  const [porResenar, setPorResenar] = React.useState<CitaPorResenar[]>([]);
  const [historias, setHistorias] = React.useState<HistoriaClinica[]>([]);
  const [reputacion, setReputacion] = React.useState<ReputacionPaciente | null>(null);
  const [errorCitas, setErrorCitas] = React.useState<string | null>(null);
  const [errorHistorias, setErrorHistorias] = React.useState<string | null>(null);
  const [errorResenas, setErrorResenas] = React.useState(false);
  const [cargando, setCargando] = React.useState(true);
  const [intento, setIntento] = React.useState(0);
  const [verTodas, setVerTodas] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCitas(null);
    setErrorHistorias(null);
    setErrorResenas(false);
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
      else {
        // Un fallo de /api/citas/por-resenar no debe bloquear el resto del resumen.
        setPorResenar([]);
        setErrorResenas(true);
      }
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

  // Una atención = cada cita COMPLETADA, con su historia clínica si el odontólogo ya la registró.
  // Las historias cuya cita queda fuera de la lista de citas también se muestran.
  const historiaPorCita = new Map(historias.map((h) => [h.cita_id, h]));
  const atenciones: Atencion[] = [
    ...citas
      .filter((c) => c.estado === "COMPLETADA")
      .map<Atencion>((c) => ({
        clave: c.id,
        servicio: c.servicio.titulo,
        odontologo: c.odontologo.nombre,
        fecha: c.inicio,
        historia: historiaPorCita.get(c.id) ?? null,
      })),
    ...historias
      .filter((h) => !citas.some((c) => c.id === h.cita_id))
      .map<Atencion>((h) => ({
        clave: `h-${h.id}`,
        servicio: h.servicio,
        odontologo: h.odontologo,
        fecha: h.fecha_cita,
        historia: h,
      })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const atencionesVisibles = verTodas ? atenciones : atenciones.slice(0, 4);
  const sinNota = atenciones.filter((a) => !a.historia).length;

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
          valor={errorResenas ? "—" : porResenar.length}
          icono={<Star className="size-5" />}
          tono="primary"
        />
        <KpiPerfil
          label="Strikes de puntualidad"
          valor={reputacion ? `${reputacion.strikes}/${reputacion.limite_strikes}` : "—"}
          icono={<ShieldAlert className="size-5" />}
          tono={reputacion && reputacion.strikes > 0 ? "destructive" : "success"}
        />
      </div>

      {/* StrikeMeter visual: barra de puntualidad con nivel */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <ShieldAlert className="size-5 text-primary" /> Puntualidad
          </CardTitle>
          <CardDescription>
            Tu nivel de asistencia a citas programadas.{" "}
            {reputacion &&
              reputacion.limite_strikes &&
              `Límite: ${reputacion.limite_strikes} strikes.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StrikeMeter strikes={reputacion?.strikes ?? 0} />
        </CardContent>
      </Card>

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
            {errorResenas ? (
              <AvisoError
                mensaje="No se pudieron cargar tus calificaciones pendientes."
                onReintentar={reintentar}
              />
            ) : porResenar.length === 0 ? (
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

      {errorHistorias && <AvisoError mensaje={errorHistorias} onReintentar={reintentar} />}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <FileText className="size-5 text-primary" /> Historial de atenciones
            </CardTitle>
            <CardDescription>
              Diagnóstico y tratamiento que registra tu odontólogo en cada cita atendida.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
            <Link to="/paciente/panel">
              Ver panel <ChevronRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!errorHistorias && !errorCitas && atenciones.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
              Aún no tienes atenciones. Cuando te atiendan, aquí verás el diagnóstico y el
              tratamiento de cada cita.
            </p>
          )}
          {sinNota > 0 && (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              {sinNota === 1
                ? "1 atención todavía no tiene diagnóstico ni tratamiento registrado."
                : `${sinNota} atenciones todavía no tienen diagnóstico ni tratamiento registrado.`}{" "}
              Tu odontólogo debe completarlo.
            </p>
          )}
          {atencionesVisibles.map((a) => (
            <div key={a.clave} className="rounded-xl border border-border/70 bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.servicio}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    con {a.odontologo} · {fechaLarga(fechaPerfil(a.fecha))}
                  </p>
                </div>
                {a.historia ? (
                  <Badge className="shrink-0 bg-success/12 text-success">
                    Con historia clínica
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-warning/50 text-warning-foreground"
                  >
                    Nota pendiente
                  </Badge>
                )}
              </div>
              {a.historia ? (
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Diagnóstico
                    </dt>
                    <dd className="mt-1 whitespace-pre-line break-words">
                      {a.historia.diagnostico}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Tratamiento
                    </dt>
                    <dd className="mt-1 whitespace-pre-line break-words">
                      {a.historia.tratamiento}
                    </dd>
                  </div>
                  {a.historia.notas ? (
                    <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Indicaciones / próximo control
                      </dt>
                      <dd className="mt-1 whitespace-pre-line break-words">{a.historia.notas}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tu odontólogo aún no registró el diagnóstico y el tratamiento de esta atención.
                </p>
              )}
            </div>
          ))}
          {atenciones.length > 4 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-primary"
              onClick={() => setVerTodas((v) => !v)}
            >
              {verTodas ? "Ver menos" : `Ver las ${atenciones.length} atenciones`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
