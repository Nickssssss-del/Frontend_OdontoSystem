import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AccionesCitaDentista } from "@/components/odontologo/AccionesCitaDentista";
import { RegistrarHistoriaDialog } from "@/components/odontologo/RegistrarHistoriaDialog";
import { useAppState, statusLabel, type Appointment } from "@/lib/app-state";
import { miPerfilApi } from "@/lib/api";
import {
  accionesDeCita,
  decisionInasistencia,
  liberarOperacion,
  mensajeTransicion,
  reservarOperacion,
} from "@/lib/atencion-cita";
import {
  idPacienteConsultable,
  reducirConsultas,
  type EstadoConsultaPaciente,
} from "@/lib/historias-clinicas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Agenda del odontólogo con citas reales, atención e historia clínica.",
      },
    ],
  }),
  component: DentistAgenda,
});

type ViewMode = "day" | "week" | "month";

const statusColors = {
  CONFIRMED: "bg-primary/12 border-l-4 border-primary text-primary",
  COMPLETED: "bg-success/12 border-l-4 border-success text-success",
  VERIFYING: "bg-warning/12 border-l-4 border-warning text-warning",
  PAYMENT_REJECTED: "bg-destructive/12 border-l-4 border-destructive text-destructive",
  CANCELLED: "bg-muted border-l-4 border-muted-foreground text-muted-foreground",
  PENDING_PAYMENT: "bg-muted/50 border-l-4 border-muted-foreground text-muted-foreground",
  NO_SHOW: "bg-destructive/12 border-l-4 border-destructive text-destructive",
} as const;

function DentistAgenda() {
  const { usuario, agenda, citasCargando, confirmarCita, completarCita, marcarInasistencia } =
    useAppState();
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [operandoId, setOperandoId] = React.useState<string | null>(null);
  const [ausenciaPara, setAusenciaPara] = React.useState<Appointment | null>(null);
  const [historiaPara, setHistoriaPara] = React.useState<Appointment | null>(null);
  const [historiasRegistradas, setHistoriasRegistradas] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [historiasCerradas, setHistoriasCerradas] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [consultas, setConsultas] = React.useState<Record<string, EstadoConsultaPaciente>>({});
  const [intentoHistorias, setIntentoHistorias] = React.useState(0);
  const enCurso = React.useRef(new Set<string>());

  const claveDia = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const pacientesConAtencion = React.useMemo(
    () =>
      [
        ...new Set(
          agenda
            .filter((cita) => cita.status === "COMPLETED")
            .map((cita) => idPacienteConsultable(cita.patientId))
            .filter((id): id is string => id !== null),
        ),
      ].sort(),
    [agenda],
  );

  const clavePacientes = pacientesConAtencion.join("|");

  React.useEffect(() => {
    if (usuario?.rol !== "ODONTOLOGO" || clavePacientes.length === 0) return;
    let vivo = true;
    const ids = clavePacientes.split("|");
    setConsultas((prev) => reducirConsultas(prev, { tipo: "iniciar", pacienteIds: ids }));
    for (const pacienteId of ids) {
      void miPerfilApi
        .historias(pacienteId)
        .then((historias) => {
          if (!vivo) return;
          setHistoriasRegistradas((prev) => {
            const next = new Set(prev);
            for (const historia of historias) next.add(historia.cita_id);
            return next;
          });
          setConsultas((prev) => reducirConsultas(prev, { tipo: "exito", pacienteId }));
        })
        .catch(() => {
          if (!vivo) return;
          setConsultas((prev) => reducirConsultas(prev, { tipo: "fallo", pacienteId }));
        });
    }
    return () => {
      vivo = false;
    };
  }, [usuario?.rol, clavePacientes, intentoHistorias]);

  const iniciar = (id: string) => {
    if (!reservarOperacion(enCurso.current, id)) return false;
    setOperandoId(id);
    return true;
  };

  const terminar = (id: string) => {
    liberarOperacion(enCurso.current, id);
    setOperandoId((actual) => (actual === id ? null : actual));
  };

  const puedeComprobar = (cita: Appointment) => {
    const pacienteId = idPacienteConsultable(cita.patientId);
    return pacienteId !== null && consultas[pacienteId] === "ok";
  };

  const accionesDe = (cita: Appointment) =>
    accionesDeCita({
      status: cita.status,
      inicioIso: cita.inicio,
      ahoraMs: Date.now(),
      historiaRegistrada: historiasRegistradas.has(cita.id),
      historiaCerrada: historiasCerradas.has(cita.id),
      puedeComprobarHistoria: puedeComprobar(cita),
    });

  const atender = async (cita: Appointment) => {
    if (!accionesDe(cita).atender || !iniciar(cita.id)) return;
    try {
      const actualizada = await completarCita(cita.id);
      const aviso = mensajeTransicion(actualizada.status, actualizada.patient || cita.patient);
      toast.success(aviso.titulo, { description: aviso.descripcion });
    } catch {
      // El contexto avisa el error y no aplica la cita si el PATCH falla.
    } finally {
      terminar(cita.id);
    }
  };

  const confirmarAusencia = async () => {
    const abierta = ausenciaPara;
    if (!abierta) return;
    const vigente = agenda.find((cita) => cita.id === abierta.id) ?? null;
    const decision = decisionInasistencia({
      elegible: vigente ? accionesDe(vigente).inasistencia : false,
      bloqueada: enCurso.current.has(abierta.id),
    });
    if (decision === "cerrar") {
      setAusenciaPara(null);
      toast.info("Esta cita ya no puede marcarse como inasistencia.");
      return;
    }
    if (decision === "esperar" || !iniciar(abierta.id)) return;
    setAusenciaPara(null);
    try {
      const actualizada = await marcarInasistencia(abierta.id);
      const aviso = mensajeTransicion(actualizada.status, actualizada.patient || abierta.patient);
      toast.warning(aviso.titulo, { description: aviso.descripcion });
    } catch {
      // El contexto avisa el error y conserva el estado anterior de la cita.
    } finally {
      terminar(abierta.id);
    }
  };

  const confirmar = async (cita: Appointment) => {
    if (!iniciar(cita.id)) return;
    try {
      await confirmarCita(cita.id);
      toast.success("Cita confirmada", { description: `${cita.patient} · ${cita.time}` });
    } catch {
      // El contexto avisa el error.
    } finally {
      terminar(cita.id);
    }
  };

  const tarjeta = (appointment: Appointment) => (
    <div className="space-y-1">
      <p className="font-semibold text-sm">{appointment.patient}</p>
      <p className="text-xs text-muted-foreground">{appointment.service}</p>
      <div className="flex items-center justify-between gap-2 pt-2">
        <span className="text-xs font-medium">S/ {appointment.amount}</span>
        <Badge variant="outline" className="h-5 text-xs">
          {statusLabel[appointment.status]}
        </Badge>
      </div>
      {appointment.status === "VERIFYING" && (
        <Button
          size="sm"
          className="mt-2 w-full"
          disabled={operandoId === appointment.id}
          onClick={() => void confirmar(appointment)}
        >
          {operandoId === appointment.id && <Loader2 className="size-4 animate-spin" />}
          Confirmar cita
        </Button>
      )}
      <AccionesCitaDentista
        cita={appointment}
        historiaRegistrada={historiasRegistradas.has(appointment.id)}
        historiaCerrada={historiasCerradas.has(appointment.id)}
        puedeComprobarHistoria={puedeComprobar(appointment)}
        operando={operandoId === appointment.id}
        onAtender={() => void atender(appointment)}
        onInasistencia={() => setAusenciaPara(appointment)}
        onRegistrar={() => {
          if (accionesDe(appointment).registrarHistoria) setHistoriaPara(appointment);
        }}
      />
    </div>
  );

  const DayView = () => {
    const delDia = agenda
      .filter((a) => a.date === claveDia(currentDate))
      .sort((x, y) => x.time.localeCompare(y.time));
    if (delDia.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          {citasCargando ? "Cargando citas…" : "No tienes citas este día."}
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {delDia.map((appointment) => (
          <motion.div
            key={appointment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-lg border border-border/70 p-3 transition-all hover:shadow-md",
              statusColors[appointment.status],
              appointment.status === "CANCELLED" && "line-through opacity-60",
            )}
          >
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{appointment.time}</p>
            {tarjeta(appointment)}
          </motion.div>
        ))}
      </div>
    );
  };

  const WeekView = () => {
    const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const semana = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - date.getDay() + 1 + i);
      return date;
    });

    return (
      <div className="sm:overflow-x-auto">
        <div className="flex flex-col gap-3 pb-4 sm:inline-flex sm:min-w-full sm:flex-row">
          {dias.map((day, idx) => {
            const date = semana[idx];
            if (!date) return null;
            const isToday = date.toDateString() === currentDate.toDateString();
            const dayAppointments = agenda
              .filter((a) => a.date === claveDia(date))
              .sort((x, y) => x.time.localeCompare(y.time));

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "rounded-lg border border-border/70 p-4 transition-all sm:min-w-[10.5rem] sm:flex-1",
                  isToday ? "border-primary/50 bg-primary/10" : "bg-muted/30",
                )}
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold">{day}</p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {dayAppointments.length > 0 ? (
                    dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "rounded p-1.5 text-xs",
                          statusColors[apt.status],
                          apt.status === "CANCELLED" && "line-through opacity-60",
                        )}
                      >
                        <p className="font-semibold">{apt.time}</p>
                        <p className="truncate">{apt.patient}</p>
                        <AccionesCitaDentista
                          cita={apt}
                          historiaRegistrada={historiasRegistradas.has(apt.id)}
                          historiaCerrada={historiasCerradas.has(apt.id)}
                          puedeComprobarHistoria={puedeComprobar(apt)}
                          operando={operandoId === apt.id}
                          onAtender={() => void atender(apt)}
                          onInasistencia={() => setAusenciaPara(apt)}
                          onRegistrar={() => {
                            if (accionesDe(apt).registrarHistoria) setHistoriaPara(apt);
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs italic text-muted-foreground">Sin citas</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // getDay(): domingo = 0; la grilla empieza en lunes, así que el domingo va en la columna 7.
    const startingDayOfWeek = firstDay.getDay() || 7;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startingDayOfWeek - 1 });
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-1 text-center text-xs font-semibold text-muted-foreground sm:p-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const date = new Date(year, month, day);
            const dayAppointments = agenda
              .filter((a) => a.date === claveDia(date))
              .sort((x, y) => x.time.localeCompare(y.time));
            const isToday = date.toDateString() === currentDate.toDateString();
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "flex aspect-square min-w-0 flex-col rounded-lg border border-border/70 p-1 text-xs transition-shadow hover:shadow-md sm:p-2",
                  isToday ? "border-primary/50 bg-primary/10" : "bg-muted/30",
                )}
              >
                <button
                  type="button"
                  className="flex h-full w-full flex-col text-left"
                  aria-label={`Ver el ${day} en la vista del día`}
                  onClick={() => {
                    setCurrentDate(date);
                    setViewMode("day");
                  }}
                >
                  <p className="font-semibold">{day}</p>
                  <div className="flex-1 overflow-hidden">
                    {dayAppointments.length > 0 && (
                      <span
                        className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground sm:hidden"
                        aria-label={`${dayAppointments.length} cita(s)`}
                      >
                        {dayAppointments.length}
                      </span>
                    )}
                    {dayAppointments.length > 0 && (
                      <div className="mt-1 hidden space-y-1 sm:block">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-xs",
                              statusColors[apt.status],
                              apt.status === "CANCELLED" && "line-through opacity-60",
                            )}
                          >
                            {apt.time}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{dayAppointments.length - 2}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  if (usuario && usuario.rol !== "ODONTOLOGO") {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">
          La agenda de atención es solo para la sesión del odontólogo.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-semibold">Agenda</h1>
          <p className="text-muted-foreground">
            {currentDate.toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <Card className="mb-8">
          {/* En fila solo desde lg: entre 768 y 1023 px el menú lateral deja poco ancho y el selector se salía. */}
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle>Selecciona vista</CardTitle>
              <CardDescription>Día, semana o mes. Incluye citas pasadas y futuras.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Periodo anterior"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
                    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
                    else newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-max text-sm font-medium">
                  {currentDate.toLocaleDateString("es-PE", { month: "short", year: "numeric" })}
                </span>
                <Button
                  aria-label="Periodo siguiente"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
                    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
                    else newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div
                role="group"
                aria-label="Vista de la agenda"
                className="grid w-full grid-cols-3 rounded-lg bg-muted p-1 sm:w-auto sm:min-w-[15rem]"
              >
                {(
                  [
                    ["day", "Día"],
                    ["week", "Semana"],
                    ["month", "Mes"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={viewMode === valor}
                    onClick={() => setViewMode(valor)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      viewMode === valor
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {Object.values(consultas).includes("error") && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center">
            <p className="flex-1">
              No se pudo comprobar si las citas atendidas ya tienen historia clínica. «Registrar
              historia» permanece oculto hasta confirmarlo.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setIntentoHistorias((n) => n + 1)}
            >
              Reintentar
            </Button>
          </div>
        )}

        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {viewMode === "day" && <DayView />}
          {viewMode === "week" && <WeekView />}
          {viewMode === "month" && <MonthView />}
        </motion.div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Leyenda de estados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { status: "CONFIRMED", label: "Confirmada", color: "bg-primary" },
                { status: "COMPLETED", label: "Completada", color: "bg-success" },
                { status: "VERIFYING", label: "Por confirmar", color: "bg-warning" },
                { status: "NO_SHOW", label: "Inasistencia", color: "bg-destructive" },
                { status: "CANCELLED", label: "Cancelada", color: "bg-muted-foreground" },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className={cn("size-3 rounded-full", item.color)} />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog
        open={ausenciaPara !== null}
        onOpenChange={(abierto) => !abierto && setAusenciaPara(null)}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar inasistencia</AlertDialogTitle>
            <AlertDialogDescription>
              {ausenciaPara
                ? `¿Confirmas que ${ausenciaPara.patient} no asistió a la cita de las ${ausenciaPara.time}? Esta acción queda registrada en el sistema.`
                : "Confirma la inasistencia."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ausenciaPara !== null && operandoId === ausenciaPara.id}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!ausenciaPara || operandoId === ausenciaPara.id}
              onClick={(event) => {
                event.preventDefault();
                void confirmarAusencia();
              }}
            >
              Registrar inasistencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RegistrarHistoriaDialog
        cita={historiaPara}
        onClose={() => setHistoriaPara(null)}
        onRegistrada={(citaId) => {
          setHistoriasRegistradas((prev) => new Set(prev).add(citaId));
        }}
        onYaExistia={(citaId) => {
          setHistoriasCerradas((prev) => new Set(prev).add(citaId));
        }}
      />
    </AppShell>
  );
}
