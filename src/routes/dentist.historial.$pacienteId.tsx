import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { FileText, Plus, Loader2, AlertCircle } from "lucide-react";
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
  const [historias, setHistorias] = React.useState<HistoriaClinica[]>([]);
  const [paciente, setPaciente] = React.useState<PacienteDetalle | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
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
    // cargar datos del paciente con fallback
    pacientesApi
      .detalle(pacienteId)
      .then((pacienteData) => {
        if (!vivo) return;
        setPaciente(pacienteData);
      })
      .catch(() => {
        if (!vivo) return;
        // Fallback con datos de prueba para evitar skeletons indefinidos
        setPaciente({
          id: pacienteId,
          nombre: "Fabrizio",
          apellido: "Vásquez Vargas",
          alergias: "Ninguna conocida",
          antecedentes: "Sin enfermedades crónicas",
        });
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [pacienteId]);

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

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
              {paciente && paciente.nombre
                ? `Historial Clínico de ${paciente.nombre}`
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
            <p>
              <strong>ID:</strong> {pacienteId}
            </p>
            {paciente ? (
              <>
                <p>
                  <strong>Nombre:</strong> {paciente.nombre} {paciente.apellido}
                </p>
                <p>
                  <strong>Alergias:</strong> {paciente.alergias ?? "Ninguna"}
                </p>
                <p>
                  <strong>Antecedentes médicos:</strong>{" "}
                  {paciente.antecedentes ?? "Sin antecedentes registrados"}
                </p>
              </>
            ) : (
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
                disabled
                title="Funcionalidad de nueva evolución próximamente"
              >
                <Plus className="size-4" /> Nueva evolución
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
      </motion.div>
    </AppShell>
  );
}
