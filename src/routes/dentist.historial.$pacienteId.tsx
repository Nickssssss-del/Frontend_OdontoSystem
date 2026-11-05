import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FileText, Plus, Loader2, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
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
import {
  historiasApi,
  miPerfilApi,
  pacientesApi,
  type HistoriaClinica,
  type PacienteDetalle,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Appointment } from "@/lib/app-state";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
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
  const [historias, setHistorias] = React.useState<HistoriaClinica[]>([]);
  const [paciente, setPaciente] = React.useState<PacienteDetalle | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [errorPaciente, setErrorPaciente] = React.useState<string | null>(null);

  const [recarga, setRecarga] = React.useState(0);
  const [citaNota, setCitaNota] = React.useState<Appointment | null>(null);
  const [diagnostico, setDiagnostico] = React.useState("");
  const [tratamiento, setTratamiento] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

  // Citas atendidas de este paciente que aún no tienen diagnóstico ni tratamiento.
  const pendientes = React.useMemo(() => {
    if (error || cargando) return [];
    const conHistoria = new Set(historias.map((h) => h.cita_id));
    const porId = new Map<string, Appointment>();
    for (const c of [...agenda, ...appointments]) {
      if (c.patientId === pacienteId && c.status === "COMPLETED" && !conHistoria.has(c.id)) {
        porId.set(c.id, c);
      }
    }
    return [...porId.values()].sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    );
  }, [agenda, appointments, historias, pacienteId, error, cargando]);

  const abrirNota = (cita: Appointment) => {
    setCitaNota(cita);
    setDiagnostico("");
    setTratamiento("");
    setNotas("");
  };

  const guardarNota = async () => {
    if (!citaNota || guardando) return;
    if (!diagnostico.trim() || !tratamiento.trim()) {
      toast.error("Completa el diagnóstico y el tratamiento");
      return;
    }
    setGuardando(true);
    try {
      await historiasApi.registrar(citaNota.id, {
        diagnostico: diagnostico.trim(),
        tratamiento: tratamiento.trim(),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      toast.success("Historia clínica guardada");
      setCitaNota(null);
      setRecarga((n) => n + 1);
    } catch (e) {
      toast.error("No se pudo guardar la historia clínica", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

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
    // cargar historial
    miPerfilApi
      .historias(pacienteId)
      .then((historiasData) => {
        if (!vivo) return;
        setHistorias(historiasData);
      })
      .catch((err) => {
        if (!vivo) return;
        setError(
          err?.response?.data?.message ?? err?.message ?? "No se pudo cargar el historial clínico.",
        );
        setHistorias([]);
      });
    pacientesApi
      .detalle(pacienteId)
      .then((pacienteData) => {
        if (!vivo) return;
        setPaciente(pacienteData);
      })
      .catch(() => {
        if (!vivo) return;
        setPaciente(null);
        setErrorPaciente("No se pudieron cargar los datos del paciente");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [pacienteId, recarga]);

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const nombreVisible = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : nombreEnLista;
  const alergias = errorPaciente ? "Sin datos" : paciente?.alergias?.trim() || "Sin datos";
  const antecedentes = errorPaciente ? "Sin datos" : paciente?.antecedentes?.trim() || "Sin datos";

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

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Historial de atenciones
                </CardTitle>
                <CardDescription>
                  Cada fila corresponde a una cita completada con nota clínica.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-1.5", "bg-background")}
                disabled={pendientes.length === 0}
                onClick={() => pendientes[0] && abrirNota(pendientes[0])}
                title={
                  pendientes.length === 0
                    ? "No hay atenciones pendientes de registrar"
                    : "Registrar diagnóstico y tratamiento"
                }
              >
                <Plus className="size-4" /> Nueva evolución
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendientes.length > 0 && (
              <div className="mb-4 space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4">
                <p className="text-sm font-semibold text-warning-foreground">
                  {pendientes.length === 1
                    ? "1 atención sin diagnóstico ni tratamiento"
                    : `${pendientes.length} atenciones sin diagnóstico ni tratamiento`}
                </p>
                {pendientes.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-3 text-sm"
                  >
                    <span>
                      {c.service} · {c.date} · {c.time}
                    </span>
                    <Button size="sm" onClick={() => abrirNota(c)}>
                      Registrar
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {cargando && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
            {error && !cargando && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="size-5 shrink-0" />
                {error}
              </div>
            )}
            {!cargando && !error && historias.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No hay atenciones registradas para este paciente.
              </p>
            )}
            {!cargando && !error && historias.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Tratamiento</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historias
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.fecha_cita).getTime() - new Date(a.fecha_cita).getTime(),
                      )
                      .map((h) => (
                        <TableRow key={h.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium whitespace-nowrap">
                            {fmtFecha(h.fecha_cita)}
                          </TableCell>
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

        <Dialog open={!!citaNota} onOpenChange={(o) => !o && !guardando && setCitaNota(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar diagnóstico y tratamiento</DialogTitle>
              <DialogDescription>
                {citaNota ? `${citaNota.service} · ${citaNota.date} · ${citaNota.time}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                rows={2}
                aria-label="Diagnóstico"
                placeholder="Diagnóstico (obligatorio)"
              />
              <Textarea
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                rows={2}
                aria-label="Tratamiento"
                placeholder="Tratamiento realizado (obligatorio)"
              />
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                aria-label="Notas"
                placeholder="Indicaciones y próximo control (opcional)"
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3 shrink-0" aria-hidden="true" /> Se guarda cifrado; solo el
                paciente y tú pueden verlo.
              </p>
              <Button className="w-full" onClick={() => void guardarNota()} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar historia clínica"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppShell>
  );
}
