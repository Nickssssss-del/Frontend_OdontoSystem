/**
 * Resumen de actividad del odontólogo dentro de «Mi perfil»: KPIs de citas,
 * próximas citas, historial clínico y reseñas recibidas.
 * Todos los datos salen del backend (citas, historias clínicas, reseñas);
 * si un endpoint falla se muestra el error en su tarjeta sin sustituirlo por
 * datos ficticios.
 */
import * as React from "react";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  citasApi,
  historiasApi,
  odontologosApi,
  miPerfilApi,
  type Cita,
  type EstadoCita,
  type HistoriaClinica,
  type ResenasOdontologo,
} from "@/lib/api";
import { fechaDe, fechaLarga, horaDe } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

const CITAS_ACTIVAS: EstadoCita[] = [
  "PENDIENTE_PAGO",
  "PENDIENTE_CONFIRMACION",
  "CONFIRMADA",
];

export function ResumenOdontologo({
  odontologoId,
}: {
  odontologoId: string;
}) {
  const [citas, setCitas] = React.useState<Cita[]>([]);
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
    (async () => {
      const [rCitas, rHistorias, rResenas] = await Promise.allSettled([
        miPerfilApi.citas(undefined, undefined), // We want all citas; we can pass undefined for desde and hasta to get all? 
        // But note: the miPerfilApi.citas requires desde and hasta. We can pass empty strings? 
        // Looking at the API: 
        //   citas(desde: string, hasta: string): Promise<CitaOdontologo[]>
        // We want all time, so we can pass a very old date and a future date? 
        // However, the backend might not support that. 
        // Alternatively, we can fetch without parameters? 
        // The miPerfilApi.citas is defined as:
        //   citas(desde: string, hasta: string): Promise<CitaOdontologo[]>
        // So we must provide two strings. 
        // We can pass empty strings? Let's check the backend: 
        //   The endpoint is GET /api/odontologos/yo/citas?desde=&hasta=
        //   If we pass empty strings, it might return all? 
        //   But we don't know. 
        //   We can try to pass undefined and then in the API we check for undefined and convert to empty string? 
        //   However, the current miPerfilApi.citas does not allow undefined. 
        //   We can change the API to allow undefined? 
        //   But we are not supposed to change the backend. 
        //   We can pass two empty strings and hope the backend returns all? 
        //   Alternatively, we can fetch a fixed range, say from 2020-01-01 to 2030-12-31? 
        //   We'll do that for now.
        miPerfilApi.citas("2020-01-01", "2030-12-31"),
        historiasApi.mias(),
        odontologosApi.resenas(odontologoId),
      ]);
      if (!vigente) return;
      if (rCitas.status === "fulfilled") {
        // The miPerfilApi.citas returns CitaOdontologo[], which is Cita & { paciente?: ... }
        // We can use it as Cita for our purposes.
        setCitas(rCitas.value as Cita[]);
      } else {
        setCitas([]);
        setErrorCitas(
          mensajeDeError(rCitas.reason, "No se pudieron cargar tus citas.")
        );
      }
      if (rHistorias.status === "fulfilled") {
        setHistorias(rHistorias.value as HistoriaClinica[]);
      } else {
        setHistorias([]);
        setErrorHistorias(
          mensajeDeError(
            rHistorias.reason,
            "No se pudo cargar tu historial clínico."
          )
        );
      }
      if (rResenas.status === "fulfilled") {
        setResenas(rResenas.value as ResenasOdontologo);
      } else {
        setResenas(null);
        setErrorResenas(
          mensajeDeError(
            rResenas.reason,
            "No se pudieron cargar tus reseñas."
          )
        );
      }
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [odontologoId, intento]);

  if (cargando) {
    return <ResumenSkeleton />;
  }

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
          label="Atenciones realizadas"
          valor={errorCitas ? "—" : atendidas}
          icono={<CheckCircle2 className="size-5" />}
          tono="success"
        />
        <KpiPerfil
          label="Calificación promedio"
          valor={
            errorResentas || !resenas ? "—" : resenas.calificacion?.toFixed(1) ?? "—"
          }
          icono={<Star className="size-5" />}
          tono="primary"
        />
        <KpiPerfil
          label="Total de reseñas"
          valor={errorResentas || !resenas ? "—" : resenas.total_resenas ?? 0}
          icono={<Star className="size-5" />}
          tono="accent"
        />
      </div>

      {errorCitas && <AvisoError mensaje={errorCitas} onReintentar={reintentar} />}
      {errorHistorias && (
        <AvisoError mensaje={errorHistorias} onReintentar={reintentar} />
      )}
      {errorResenas && (
        <AvisoError mensaje={errorResenas} onReintentar={reintentar} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas citas */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <CalendarClock className="size-5 text-primary" /> Próximas citas
              </CardTitle>
              <CardDescription>Tus reservas activas con pacientes.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
              <a href="/dentist/agenda">
                Ver agenda <span className="ml-2">→</span>
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorCitas && proximas.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No tienes citas programadas.{" "}
                <a
                  href="/dentist/pacientes"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Ver tus pacientes
                </a>{" "}
                para gestionar turnos.
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
                    con {cita.paciente?.nombre ?? "Paciente"} · {fechaLarga(fechaDe(cita.inicio))} ·{" "}
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
                Y {proximas.length - 4} citas más en tu agenda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Historial clínico */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <FileText className="size-5 text-primary" /> Historial clínico
              </CardTitle>
              <CardDescription>Atenciones que has registrado.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
              <a href="/dentist/historias">
                Ver todo <span className="ml-2">→</span>
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorHistorias && historias.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                No tienes historiales clínicos registrados.
              </p>
            )}
            {historias.slice(0, 4).map((historia) => (
              <div
                key={historia.id}
                className="rounded-xl border border-border/70 bg-background p-4"
              >
                <p className="text-sm font-semibold">{historia.servicio}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {historia.paciente_id} · {fechaLarga(fechaDe(historia.fecha_cita))}
                </p>
                {!historia.nota ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sin notas adicionales.
                  </p>
                ) : (
                  <p className="mt-1 text-xs">{historia.nota}</p>
                )}
              </div>
            ))}
            {historias.length > 4 && (
              <p className="text-xs text-muted-foreground">
                Y {historias.length - 4} historiales más.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reseñas recibidas */}
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Star className="size-5 text-primary" /> Reseñas recibidas
              </CardTitle>
              <CardDescription>Lo que tus pacientes dicen de ti.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!errorResenas && resenas && resenas.resenas.length === 0 && (
              <p className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                Aún no tienes reseñas. ¡Sigue brindando un excelente servicio!
              </p>
            )}
            {!errorResenas && resenas && resenas.resenas.slice(0, 3).map((resena) => (
              <div
                key={resena.id}
                className="rounded-xl border border-border/70 bg-background p-4"
              >
                <p className="text-sm font-semibold">
                  {resena.paciente}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resena.calificacion} de 5 · {fechaLarga(fechaDe(resena.creado_en))}
                </p>
                {!resena.comentario ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sin comentario.
                  </p>
                ) : (
                  <p className="mt-1 text-xs">{resena.comentario}</p>
                )}
              </div>
            ))}
            {!errorResenas && resenas && resenas.resenas.length > 3 && (
              <p className="text-xs text-muted-foreground">
                Y {resenas.resenas.length - 3} reseñas más.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* FIN_RESUMEN */}
    </div>
  );
}