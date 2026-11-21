import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FileText, Loader2, AlertCircle, ClipboardList, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { miPerfilApi, pacientesApi, type HistoriaClinica, type PacienteDetalle } from "@/lib/api";
import { detalleDeError } from "@/components/perfil/perfilUtils";
import {
  estadoListaHistorias,
  fechaAtencionVisible,
  historiasDelPaciente,
  idPacienteConsultable,
} from "@/lib/historias-clinicas";
import { useAppState } from "@/lib/app-state";
import { citaAAppointment, type Appointment } from "@/lib/app-state-types";
import {
  buscarCitasSinHistoria,
  objetivoPendientes,
  type BusquedaSinHistoria,
} from "@/lib/citas-sin-historia";
import { RegistrarHistoriaDialog } from "@/components/odontologo/RegistrarHistoriaDialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dentist/historial/$pacienteId")({
  head: () => ({
    meta: [
      { title: "Historial Clínico | OdontoSystem Odontólogo" },
      { name: "description", content: "Consulta y registra la historia clínica del paciente." },
    ],
  }),
  component: HistorialClinicoPaciente,
});

function HistorialClinicoPaciente() {
  const { pacienteId } = Route.useParams();
  const { agenda, appointments } = useAppState();
  const [vista, setVista] = React.useState<{
    pacienteId: string;
    historias: HistoriaClinica[];
  } | null>(null);
  const [paciente, setPaciente] = React.useState<PacienteDetalle | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [errorPaciente, setErrorPaciente] = React.useState<string | null>(null);
  const [intento, setIntento] = React.useState(0);
  const [pacientePedido, setPacientePedido] = React.useState(pacienteId);

  if (pacientePedido !== pacienteId) {
    setPacientePedido(pacienteId);
    setVista(null);
    setPaciente(null);
    setCargando(true);
    setError(null);
    setErrorPaciente(null);
  }

  const nombreEnLista = React.useMemo(() => {
    const cita = [...agenda, ...appointments].find((c) => c.patientId === pacienteId);
    const nombre = cita?.patient?.trim();
    return nombre || null;
  }, [agenda, appointments, pacienteId]);

  React.useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    setErrorPaciente(null);
    setPaciente(null);
    setVista(null);

    const idConsulta = idPacienteConsultable(pacienteId);
    if (!idConsulta) {
      setCargando(false);
      setError(
        "No se consulta el historial: el valor recibido no es un identificador de paciente. Un nombre no se envía como paciente_id.",
      );
      return () => {
        vivo = false;
      };
    }

    const historiasP = miPerfilApi
      .historias(idConsulta)
      .then((historiasData) => {
        if (!vivo) return;
        setVista({ pacienteId: idConsulta, historias: historiasData });
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        setVista(null);
        setError(detalleDeError(err, "No se pudo cargar el historial clínico."));
      });

    const pacienteP = pacientesApi
      .detalle(idConsulta)
      .then((pacienteData) => {
        if (!vivo) return;
        setPaciente(pacienteData);
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        setPaciente(null);
        // Con el motivo del backend (403, 404, 5xx o sin conexión) se puede diagnosticar el fallo (DISP02-O06).
        setErrorPaciente(
          `No se pudieron cargar los datos del paciente: ${detalleDeError(err, "error desconocido")}`,
        );
      });

    void Promise.allSettled([historiasP, pacienteP]).then(() => {
      if (vivo) setCargando(false);
    });

    return () => {
      vivo = false;
    };
  }, [pacienteId, intento]);

  const idConsulta = idPacienteConsultable(pacienteId);
  const historias = historiasDelPaciente(vista, idConsulta ?? pacienteId);
  const estadoLista = estadoListaHistorias({
    cargando,
    error,
    total: historias.length,
  });

  const fmtFecha = fechaAtencionVisible;

  const nombreVisible = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : nombreEnLista;
  const alergias = errorPaciente ? "Sin datos" : paciente?.alergias?.trim() || "Sin datos";
  const antecedentes = errorPaciente ? "Sin datos" : paciente?.antecedentes?.trim() || "Sin datos";

  // Citas atendidas sin historia (mismo cálculo que la ficha de la app móvil, DISP02-O07):
  // atendidas según el detalle − historias registradas; se buscan en la agenda hacia atrás.
  const objetivo = objetivoPendientes(paciente?.citas_atendidas, vista ? historias.length : null);
  const claveConHistoria = historias
    .map((h) => h.cita_id)
    .sort()
    .join(",");
  const [busqueda, setBusqueda] = React.useState<
    | { estado: "buscando" }
    | { estado: "lista"; datos: BusquedaSinHistoria }
    | { estado: "error"; motivo: string }
    | null
  >(null);
  const [intentoBusqueda, setIntentoBusqueda] = React.useState(0);
  const [paraRegistrar, setParaRegistrar] = React.useState<Appointment | null>(null);

  React.useEffect(() => {
    if (cargando || !idConsulta) {
      setBusqueda(null);
      return;
    }
    if (objetivo === 0) {
      setBusqueda({ estado: "lista", datos: { citas: [], revisadoDesde: "" } });
      return;
    }
    let vivo = true;
    setBusqueda({ estado: "buscando" });
    buscarCitasSinHistoria(idConsulta, {
      objetivo,
      conHistoria: new Set(claveConHistoria ? claveConHistoria.split(",") : []),
      pedirAgenda: (desde, hasta) => miPerfilApi.citas(desde, hasta),
    })
      .then((datos) => {
        if (vivo) setBusqueda({ estado: "lista", datos });
      })
      .catch((err: unknown) => {
        if (vivo)
          setBusqueda({
            estado: "error",
            motivo: detalleDeError(err, "No se pudo revisar la agenda."),
          });
      });
    return () => {
      vivo = false;
    };
  }, [cargando, idConsulta, objetivo, claveConHistoria, intentoBusqueda]);

  const sinHistoria = busqueda?.estado === "lista" ? busqueda.datos.citas : [];
  const totalSinHistoria = Math.max(objetivo ?? 0, sinHistoria.length);
  const noListadas = busqueda?.estado === "lista" ? totalSinHistoria - sinHistoria.length : 0;
  const mostrarSinHistoria =
    busqueda !== null &&
    (busqueda.estado === "buscando"
      ? (objetivo ?? 0) > 0
      : busqueda.estado === "error" || totalSinHistoria > 0);
  /** Tras guardar (o 409 «ya existía») se recargan historias y pendientes, como hace la app. */
  const recargarTodo = () => setIntento((n) => n + 1);

  const historiasOrdenadas = historias
    .slice()
    .sort((a, b) => new Date(b.fecha_cita).getTime() - new Date(a.fecha_cita).getTime());

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <header>
          <p className="flex items-center gap-2 text-sm text-primary">
            <FileText className="size-4" /> Historial clínico
          </p>
          {cargando ? (
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-8 w-48 animate-pulse" />
            </div>
          ) : (
            <h1 className="font-display text-3xl font-semibold">
              {nombreVisible
                ? `Historial Clínico de ${nombreVisible}`
                : "Historial Clínico del Paciente"}
            </h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Visualiza atenciones, diagnósticos y tratamientos; registra nuevas evoluciones.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" /> Resumen del paciente
            </CardTitle>
            <CardDescription>Datos generales, alergias y antecedentes médicos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {errorPaciente && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="size-5 shrink-0" />
                {errorPaciente}
              </div>
            )}
            {cargando && !errorPaciente ? (
              <>
                <div>
                  <strong>Nombre:</strong> <Skeleton className="h-4 w-32 animate-pulse ml-2" />
                </div>
                <div>
                  <strong>Alergias:</strong> <Skeleton className="h-4 w-32 animate-pulse ml-2" />
                </div>
                <div>
                  <strong>Antecedentes médicos:</strong>{" "}
                  <Skeleton className="h-4 w-48 animate-pulse ml-2" />
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>Nombre:</strong> {nombreVisible ?? "Sin datos"}
                </p>
                <p>
                  <strong>Alergias:</strong> {alergias}
                </p>
                <p>
                  <strong>Antecedentes médicos:</strong> {antecedentes}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {mostrarSinHistoria && (
          <Card className="border-warning/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" /> Citas atendidas sin historia
                clínica
              </CardTitle>
              <CardDescription>
                {totalSinHistoria > 0 && (
                  <strong>
                    {totalSinHistoria === 1
                      ? "1 cita atendida sin historia clínica. "
                      : `${totalSinHistoria} citas atendidas sin historia clínica. `}
                  </strong>
                )}
                Se registra una sola vez por cita y no se puede editar después.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {busqueda?.estado === "buscando" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="size-4 animate-spin" /> Buscando las citas…
                </p>
              )}
              {busqueda?.estado === "error" && (
                <div
                  role="alert"
                  className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center"
                >
                  <AlertCircle className="size-5 shrink-0" />
                  <p className="flex-1">{busqueda.motivo}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setIntentoBusqueda((n) => n + 1)}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              {sinHistoria.length > 0 && (
                <ul className="space-y-2" aria-label="Citas atendidas sin historia clínica">
                  {sinHistoria.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.servicio.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtFecha(c.inicio)} ·{" "}
                          {new Intl.DateTimeFormat("es-PE", {
                            timeZone: "America/Lima",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }).format(new Date(c.inicio))}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setParaRegistrar(citaAAppointment(c))}
                      >
                        <Plus className="size-4" /> Registrar historia
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {noListadas > 0 && busqueda?.estado === "lista" && (
                <p className="text-xs text-muted-foreground">
                  {noListadas === 1
                    ? "1 cita atendida es anterior"
                    : `${noListadas} citas atendidas son anteriores`}{" "}
                  al {fmtFecha(busqueda.datos.revisadoDesde)} y no se muestra
                  {noListadas === 1 ? "" : "n"} aquí.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <RegistrarHistoriaDialog
          cita={paraRegistrar}
          onClose={() => setParaRegistrar(null)}
          onRegistrada={recargarTodo}
          onYaExistia={recargarTodo}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Historial de atenciones
                </CardTitle>
                <CardDescription>
                  Historias clínicas que registraste para este paciente, de la más reciente a la más
                  antigua.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setIntento((n) => n + 1)}
                disabled={cargando}
              >
                Reintentar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {estadoLista === "cargando" && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
            {estadoLista === "error" && (
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center">
                <AlertCircle className="size-5 shrink-0" />
                <p className="flex-1">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setIntento((n) => n + 1)}
                >
                  Reintentar consulta
                </Button>
              </div>
            )}
            {estadoLista === "vacio" && (
              <p className="py-8 text-center text-muted-foreground">
                No hay historias clínicas registradas para este paciente.
              </p>
            )}
            {estadoLista === "lista" && (
              <ul className="space-y-3 md:hidden" aria-label="Historias clínicas">
                {historiasOrdenadas.map((h) => (
                  <li key={h.id} className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-semibold">{fmtFecha(h.fecha_cita)}</p>
                      <p className="text-sm text-muted-foreground">{h.servicio}</p>
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Diagnóstico</dt>
                        <dd className="break-words">{h.diagnostico}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Tratamiento</dt>
                        <dd className="break-words">{h.tratamiento}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">Notas</dt>
                        <dd className="break-words">
                          {h.notas ?? <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
            {estadoLista === "lista" && (
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cita</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Tratamiento</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historiasOrdenadas.map((h) => (
                      <TableRow key={h.id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap font-medium">
                          {fmtFecha(h.fecha_cita)}
                        </TableCell>
                        <TableCell>{h.servicio}</TableCell>
                        <TableCell>{h.diagnostico}</TableCell>
                        <TableCell>{h.tratamiento}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {h.notas ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}
