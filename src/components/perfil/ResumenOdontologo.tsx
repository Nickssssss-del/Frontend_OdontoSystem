/**
 * Resumen de actividad del odontólogo dentro de «Mi perfil»: KPIs de citas,
 * próximas citas, atenciones registradas y calificaciones recibidas.
 * Los datos salen del backend; si un endpoint falla se muestra el error
 * en su tarjeta, sin sustituirlo por datos ficticios.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, CalendarClock, CheckCircle2, ChevronRight, FileText, Star } from "lucide-react";
import {
  AvisoError,
  claseEstadoCita,
  etiquetaEstadoCita,
  fechaPerfil,
  KpiPerfil,
  mensajeDeError,
  rangoAgendaOdontologo,
  ResumenSkeleton,
} from "@/components/perfil/PerfilComunes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  miPerfilApi,
  odontologosApi,
  type CitaOdontologo,
  type EstadoCita,
  type HistoriaClinica,
  type ResenasOdontologo,
} from "@/lib/api";
import { fechaLarga, horaDe } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

const CITAS_ACTIVAS: EstadoCita[] = ["PENDIENTE_PAGO", "PENDIENTE_CONFIRMACION", "CONFIRMADA"];

export function ResumenOdontologo({ odontologoId }: { odontologoId: string }) {
  const [citas, setCitas] = React.useState<CitaOdontologo[]>([]);
  const [historias, setHistorias] = React.useState<HistoriaClinica[]>([]);
  const [resenas, setResenas] = React.useState<ResenasOdontologo | null>(null);
  const [errorCitas, setErrorCitas] = React.useState<string | null>(null);
  const [errorHistorias, setErrorHistorias] = React.useState<string | null>(null);
  const [errorResenas, setErrorResenas] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    let vigente = true;
    setCargando(true);
    setErrorCitas(null);
    setErrorHistorias(null);
    setErrorResenas(null);
    const { desde, hasta } = rangoAgendaOdontologo();
    (async () => {
      const [rCitas, rHistorias, rResenas] = await Promise.allSettled([
        miPerfilApi.citas(desde, hasta),
        miPerfilApi.historias(),
        odontologosApi.resenas(odontologoId),
      ]);
      if (!vigente) return;
      if (rCitas.status === "fulfilled") setCitas(rCitas.value);
      else {
        setCitas([]);
        setErrorCitas(mensajeDeError(rCitas.reason, "No se pudieron cargar tus citas."));
      }
      if (rHistorias.status === "fulfilled") setHistorias(rHistorias.value);
      else {
        setHistorias([]);
        setErrorHistorias(
          mensajeDeError(rHistorias.reason, "No se pudieron cargar tus atenciones."),
        );
      }
      if (rResenas.status === "fulfilled") setResenas(rResenas.value);
      else {
        setResenas(null);
        setErrorResenas(
          mensajeDeError(rResenas.reason, "No se pudieron cargar tus calificaciones."),
        );
      }
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [odontologoId, intento]);

  if (cargando) return <ResumenSkeleton />;

  const ahora = Date.now();
  const proximas = citas
    .filter((c) => CITAS_ACTIVAS.includes(c.estado) && new Date(c.fin).getTime() > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const atendidas = citas.filter((c) => c.estado === "COMPLETADA").length;
  const reintentar = () => setIntento((i) => i + 1);
  const promedio =
    resenas && Number.isFinite(resenas.calificacion) && resenas.calificacion > 0
      ? resenas.calificacion.toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiPerfil
          label="Próximas citas"
          valor={errorCitas ? "—" : proximas.length}
          icono={<Calendar className="size-5" />}
          tono="accent"
        />
        <KpiPerfil
          label="Atenciones"
          valor={errorCitas ? "—" : atendidas}
          icono={<CheckCircle2 className="size-5" />}
          tono="success"
        />
        <KpiPerfil
          label="Calificación"
          valor={errorResenas ? "—" : promedio}
          icono={<Star className="size-5" />}
          tono="primary"
        />
        <KpiPerfil
          label="Reseñas"
          valor={errorResenas || !resenas ? "—" : resenas.total_resenas}
          icono={<FileText className="size-5" />}
          tono="accent"
        />
      </div>

      {errorCitas && <AvisoError mensaje={errorCitas} onReintentar={reintentar} />}
      {errorHistorias && <AvisoError mensaje={errorHistorias} onReintentar={reintentar} />}
      {errorResenas && <AvisoError mensaje={errorResenas} onReintentar={reintentar} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <CalendarClock className="size-5 text-primary" /> Próximas citas
              </CardTitle>
              <CardDescription>Reservas activas en tu agenda.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
              <Link to="/dentist/agenda">
                Ver agenda <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorCitas && proximas.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No tienes citas programadas en este periodo.
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
                    {cita.paciente?.nombre ? `con ${cita.paciente.nombre} · ` : ""}
                    {fechaLarga(fechaPerfil(cita.inicio))} · {horaDe(cita.inicio)}
                  </p>
                </div>
                <Badge className={cn("shrink-0", claseEstadoCita[cita.estado])}>
                  {etiquetaEstadoCita[cita.estado]}
                </Badge>
              </div>
            ))}
            {proximas.length > 4 && (
              <p className="text-xs text-muted-foreground">
                Y {proximas.length - 4} citas más en tu agenda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <FileText className="size-5 text-primary" /> Atenciones registradas
            </CardTitle>
            <CardDescription>Historias clínicas que has documentado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorHistorias && historias.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                Todavía no hay atenciones registradas.
              </p>
            )}
            {historias.slice(0, 4).map((historia) => (
              <div
                key={historia.id}
                className="rounded-xl border border-border/70 bg-background p-4"
              >
                <p className="text-sm font-semibold">{historia.servicio}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fechaLarga(fechaPerfil(historia.fecha_cita))}
                </p>
                {historia.diagnostico ? (
                  <p className="mt-1 text-xs">Diagnóstico: {historia.diagnostico}</p>
                ) : null}
              </div>
            ))}
            {historias.length > 4 && (
              <p className="text-xs text-muted-foreground">
                Y {historias.length - 4} atenciones más.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Star className="size-5 text-primary" /> Calificaciones
          </CardTitle>
          <CardDescription>
            Lo que tus pacientes han publicado sobre tus atenciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!errorResenas && resenas && resenas.resenas.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
              Aún no tienes calificaciones publicadas.
            </p>
          )}
          {!errorResenas &&
            resenas?.resenas.slice(0, 3).map((resena) => (
              <div key={resena.id} className="rounded-xl border border-border/70 bg-background p-4">
                <p className="text-sm font-semibold">{resena.paciente}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resena.calificacion} de 5 · {fechaLarga(fechaPerfil(resena.creado_en))}
                </p>
                {resena.comentario ? <p className="mt-1 text-xs">{resena.comentario}</p> : null}
              </div>
            ))}
          {!errorResenas && resenas && resenas.resenas.length > 3 && (
            <p className="text-xs text-muted-foreground">
              Y {resenas.resenas.length - 3} calificaciones más.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
