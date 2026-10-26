import * as React from "react";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
} from "recharts";
import {
  Activity,
  BadgeCheck,
  CalendarX2,
  CheckCircle2,
  Lock,
  NotebookPen,
  Receipt,
  ThumbsDown,
  TrendingUp,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { VoucherBadge, VoucherReceipt } from "@/components/VoucherBits";
import { soles } from "@/lib/mock-data";
import { historiasApi } from "@/lib/api";
import { fechaLima } from "@/lib/odontologos";
import {
  motivosRechazo,
  statusClass,
  statusLabel,
  useAppState,
  type Appointment,
} from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/odontologo")({
  head: () => ({
    meta: [
      { title: "Agenda y KPIs del odontólogo | OdontoSystem" },
      {
        name: "description",
        content:
          "Cronograma diario por horas, ingresos en soles, notas clínicas cifradas, control de ausencias y bloqueo rápido de horarios.",
      },
      { property: "og:title", content: "Agenda y KPIs del odontólogo | OdontoSystem" },
      {
        property: "og:description",
        content: "Panel del odontólogo con agenda por horas, ingresos S/ y registro de evolución.",
      },
    ],
  }),
  component: Odontologo,
});

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function Odontologo() {
  const {
    agenda,
    appointments,
    confirmarCita,
    completarCita,
    marcarInasistencia,
    blockedToday,
    setBlockedToday,
    vouchersPorRevisar,
    approveVoucher,
  } = useAppState();
  const [notaFor, setNotaFor] = React.useState<Appointment | null>(null);
  const [nota, setNota] = React.useState("");
  const [diagnostico, setDiagnostico] = React.useState("");
  const [tratamiento, setTratamiento] = React.useState("");
  const [guardandoNota, setGuardandoNota] = React.useState(false);
  const [revisandoId, setRevisandoId] = React.useState<string | null>(null);
  const [motivo, setMotivo] = React.useState(motivosRechazo[0]!);
  const [modoRechazo, setModoRechazo] = React.useState(false);

  const location = useLocation();
  const mostrarConfiguracion = location.pathname === "/odontologo/configuracion";

  const revisando = vouchersPorRevisar.find((a) => a.id === revisandoId) ?? null;
  const enRevision = vouchersPorRevisar.filter((a) => a.voucher?.status === "EN_REVISION");

  const abrirRevision = (a: Appointment) => {
    setRevisandoId(a.id);
    setModoRechazo(false);
    setMotivo(motivosRechazo[0]!);
  };

  const aprobar = (a: Appointment) => {
    approveVoucher(a.id);
    setRevisandoId(null);
    toast.success("Comprobante aprobado", {
      description: `La cita de ${a.patient} pasó a CONFIRMED.`,
    });
  };

  // El backend no maneja comprobantes manuales (la pasarela es simulada), por eso no hay rechazo.
  const rechazar = (_a: Appointment) => {
    setRevisandoId(null);
    setModoRechazo(false);
    toast.info("Los pagos se verifican automáticamente en la pasarela.");
  };

  const hoy = fechaLima(0);
  const mesActual = hoy.slice(0, 7);
  const citasHoy = agenda
    .filter((a) => a.date === hoy)
    .sort((x, y) => x.time.localeCompare(y.time));
  const atendidas = citasHoy.filter((a) => a.status === "COMPLETED").length;
  const ingresosMes = appointments
    .filter((a) => a.status === "COMPLETED" && a.date.startsWith(mesActual))
    .reduce((suma, a) => suma + a.amount, 0);
  // Ingresos por mes con las citas atendidas que trae la agenda (ventana de ~2 meses).
  const ingresosMensuales = Object.entries(
    appointments
      .filter((a) => a.status === "COMPLETED")
      .reduce<Record<string, number>>((acc, a) => {
        const mes = a.date.slice(0, 7);
        acc[mes] = (acc[mes] ?? 0) + a.amount;
        return acc;
      }, {}),
  )
    .sort(([m1], [m2]) => m1.localeCompare(m2))
    .map(([mes, ingresos]) => ({
      mes: new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" })
        .format(new Date(`${mes}-15T12:00:00Z`))
        .replace(".", ""),
      ingresos,
    }));
  const pendientesConfirmar = citasHoy.filter((a) => a.status === "VERIFYING").length;
  const ocupacion = Math.min(100, Math.round((citasHoy.length / 10) * 100));

  const marcarAtendido = async (a: Appointment) => {
    try {
      await completarCita(a.id);
    } catch {
      return; // el contexto ya mostró el error
    }
    setNotaFor({ ...a, status: "COMPLETED" });
    setNota("");
    setDiagnostico("");
    setTratamiento("");
  };

  const registrarAusencia = async (a: Appointment) => {
    try {
      await marcarInasistencia(a.id);
    } catch {
      return;
    }
    toast.warning("Inasistencia registrada", {
      description: `El sistema aplicó un strike a ${a.patient}.`,
    });
  };

  const confirmar = async (a: Appointment) => {
    try {
      await confirmarCita(a.id);
      toast.success("Cita confirmada", { description: `${a.patient} · ${a.time}` });
    } catch {
      /* el contexto ya mostró el error */
    }
  };

  /** POST /api/citas/{id}/historia — diagnóstico y tratamiento son obligatorios en el backend. */
  const guardarNota = async () => {
    if (!notaFor || guardandoNota) return;
    if (!diagnostico.trim() || !tratamiento.trim()) {
      toast.error("Completa el diagnóstico y el tratamiento");
      return;
    }
    setGuardandoNota(true);
    try {
      await historiasApi.registrar(notaFor.id, {
        diagnostico: diagnostico.trim(),
        tratamiento: tratamiento.trim(),
        ...(nota.trim() ? { notas: nota.trim() } : {}),
      });
      setNotaFor(null);
      toast.success("Historia clínica guardada", {
        description: "Se almacenó cifrada y solo el paciente y tú pueden verla.",
      });
    } catch (e) {
      toast.error("No se pudo guardar la historia clínica", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardandoNota(false);
    }
  };

  return (
    <AppShell>
      {mostrarConfiguracion ? (
        <Outlet />
      ) : (
        <>
          {blockedToday && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              <div className="flex items-start gap-3">
                <X className="size-5 shrink-0" />
                <div>
                  <h3 className="font-medium">Bloqueo express activado</h3>
                  <p className="text-sm">
                    Los turnos de hoy han sido cancelados o pausados por emergencia. El bloqueo se
                    mantendrá activo hasta que lo desactives desde la configuración.
                  </p>
                </div>
              </div>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BadgeCheck className="size-4 text-primary" /> COP-24851 verificado
              </p>
              <h1 className="font-display text-3xl font-semibold">Dra. Claudia Manrique</h1>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setBlockedToday(!blockedToday);
                toast[blockedToday ? "info" : "error"](
                  blockedToday ? "Horario reabierto" : "Horario de hoy bloqueado",
                  {
                    description: blockedToday
                      ? "Tus bloques vuelven a estar disponibles en el catálogo."
                      : "Los cupos libres de hoy dejaron de ofrecerse a nuevos pacientes.",
                  },
                );
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors",
                blockedToday
                  ? "bg-destructive text-destructive-foreground"
                  : "border border-destructive/40 text-destructive hover:bg-destructive/10",
              )}
            >
              <CalendarX2 className="size-4" />
              {blockedToday ? "Horario bloqueado hoy" : "Bloquear horario hoy"}
            </motion.button>
          </motion.div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Kpi
              icon={<TrendingUp className="size-5" />}
              label="Ingresos del mes"
              value={soles(ingresosMes)}
              delay={0}
            />
            <Kpi
              icon={<CheckCircle2 className="size-5" />}
              label="Citas atendidas hoy"
              value={`${atendidas} / ${citasHoy.length}`}
              delay={0.06}
            />
            <Kpi
              icon={<Activity className="size-5" />}
              label="Tasa de ocupación"
              value={`${ocupacion}%`}
              delay={0.12}
            />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 rounded-3xl border border-border bg-card p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
                <Receipt className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold">Comprobantes Yape / Plin</h2>
                <p className="text-sm text-muted-foreground">
                  Revisa cada captura y aprueba o rechaza el anticipo de S/ 20.
                </p>
              </div>
              <span className="rounded-full border border-warning/40 bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                {enRevision.length} en revisión
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {vouchersPorRevisar.map((a) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{a.patient}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date} · {a.time} · {a.service}
                        </p>
                      </div>
                      <span className="font-display text-sm font-semibold">{soles(a.amount)}</span>
                    </div>
                    {a.voucher && <VoucherBadge status={a.voucher.status} className="mt-3" />}
                    {a.voucher?.status === "RECHAZADO" && a.voucher.reason && (
                      <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">
                        Motivo: {a.voucher.reason}
                      </p>
                    )}
                    <button
                      onClick={() => abrirRevision(a)}
                      className="mt-3 w-full rounded-full border border-border py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                    >
                      Ver comprobante adjunto
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {vouchersPorRevisar.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay comprobantes registrados.</p>
              )}
            </div>
          </motion.section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <h2 className="font-display text-lg font-semibold">Rendimiento mensual (S/)</h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ingresosMensuales}>
                    <defs>
                      <linearGradient id="ing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ReTooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        color: "var(--color-card-foreground)",
                      }}
                      formatter={(v: number) => soles(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingresos"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      fill="url(#ing)"
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <h2 className="mt-8 font-display text-lg font-semibold">Disponibilidad semanal</h2>
              <div className="mt-3 space-y-2">
                {dias.map((d, i) => (
                  <motion.div
                    key={d}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="w-24 font-medium">{d}</span>
                    <input
                      defaultValue={i === 5 ? "09:00" : "08:00"}
                      className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-center outline-none focus:border-primary"
                    />
                    <span className="text-muted-foreground">a</span>
                    <input
                      defaultValue={i === 5 ? "13:00" : "19:00"}
                      className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-center outline-none focus:border-primary"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <h2 className="font-display text-lg font-semibold">
                Cronograma de hoy · {hoy.split("-").reverse().join("/")}
                {pendientesConfirmar > 0 && ` · ${pendientesConfirmar} por confirmar`}
              </h2>
              <div className="mt-4 space-y-2">
                {citasHoy.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    {blockedToday ? "Agenda bloqueada por hoy." : "No tienes citas para hoy."}
                  </p>
                )}
                {citasHoy.map((cita) => {
                  const t = cita.time;
                  return (
                    <div key={t} className="flex gap-3">
                      <span className="w-14 pt-3 text-xs font-semibold tabular-nums text-muted-foreground">
                        {t}
                      </span>
                      {cita ? (
                        <motion.div
                          layout
                          className="flex-1 rounded-2xl border border-border bg-background p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="flex-1 font-medium">{cita.patient}</p>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                statusClass[cita.status],
                              )}
                            >
                              {statusLabel[cita.status]}
                            </span>
                            <span className="text-sm font-semibold">{soles(cita.amount)}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{cita.service}</p>
                          {cita.note && (
                            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted/60 p-2 text-xs text-muted-foreground">
                              <Lock className="mt-0.5 size-3 shrink-0" aria-label="Cifrado" />{" "}
                              {cita.note}
                            </p>
                          )}
                          {cita.voucher && (
                            <button
                              onClick={() => abrirRevision(cita)}
                              className="mt-2 flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning-foreground"
                            >
                              <Receipt className="size-3.5" />
                              Revisar comprobante
                            </button>
                          )}
                          {cita.status === "VERIFYING" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => void confirmar(cita)}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                              >
                                <CheckCircle2 className="mr-1 inline size-3.5" />
                                Confirmar cita
                              </button>
                            </div>
                          )}
                          {cita.status === "CONFIRMED" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => void marcarAtendido(cita)}
                                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                              >
                                <CheckCircle2 className="mr-1 inline size-3.5" />
                                Marcar como atendido
                              </button>
                              <button
                                onClick={() => void registrarAusencia(cita)}
                                className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                              >
                                <UserX className="mr-1 inline size-3.5" />
                                Registrar ausencia
                              </button>
                            </div>
                          )}
                          {cita.status === "COMPLETED" && (
                            <button
                              onClick={() => {
                                setNotaFor(cita);
                                setNota(cita.note ?? "");
                              }}
                              className="mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                            >
                              <NotebookPen className="mr-1 inline size-3.5" />
                              Registrar evolución
                            </button>
                          )}
                        </motion.div>
                      ) : (
                        <div
                          className={cn(
                            "flex-1 rounded-2xl border border-dashed p-3 text-sm",
                            blockedToday
                              ? "border-destructive/30 bg-destructive/5 text-destructive"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {blockedToday ? "Bloqueado por imprevisto" : "Disponible"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {revisando?.voucher && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRevisandoId(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold">Verificación de pago</h2>
                      <p className="text-sm text-muted-foreground">
                        {revisando.patient} · {revisando.date} · {revisando.time}
                      </p>
                    </div>
                    <button
                      onClick={() => setRevisandoId(null)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <VoucherBadge status={revisando.voucher.status} className="mt-3" />

                  <div className="mt-4">
                    <VoucherReceipt voucher={revisando.voucher} />
                  </div>

                  {revisando.voucher.status === "APROBADO" ? (
                    <p className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-3 text-sm text-success-foreground">
                      Pago aprobado. La cita quedó confirmada para el paciente.
                    </p>
                  ) : modoRechazo ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4"
                    >
                      <p className="text-sm font-medium">Motivo del rechazo</p>
                      <div className="mt-2 space-y-2">
                        {motivosRechazo.map((m) => (
                          <button
                            key={m}
                            onClick={() => setMotivo(m)}
                            className={cn(
                              "w-full rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors",
                              motivo === m
                                ? "border-destructive bg-destructive/10 text-destructive"
                                : "border-border text-muted-foreground hover:border-destructive/50",
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value.slice(0, 160))}
                        aria-label="Motivo personalizado"
                        placeholder="O escribe un motivo personalizado"
                        className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setModoRechazo(false)}
                          className="flex-1 rounded-full border border-border py-3 text-sm font-semibold"
                        >
                          Volver
                        </button>
                        <button
                          disabled={motivo.trim().length < 5}
                          onClick={() => rechazar(revisando)}
                          className="flex-1 rounded-full bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:bg-muted disabled:text-muted-foreground"
                        >
                          Confirmar rechazo
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setModoRechazo(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/40 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <ThumbsDown className="size-4" /> Rechazar
                      </button>
                      <button
                        onClick={() => aprobar(revisando)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success py-3 text-sm font-semibold text-success-foreground"
                      >
                        <CheckCircle2 className="size-4" /> Aprobar
                      </button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {notaFor && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNotaFor(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        Registrar evolución / nota clínica
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {notaFor.patient} · {notaFor.time} · {notaFor.service}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotaFor(null)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                  <textarea
                    value={diagnostico}
                    aria-label="Diagnóstico"
                    onChange={(e) => setDiagnostico(e.target.value)}
                    rows={2}
                    placeholder="Diagnóstico (obligatorio)"
                    className="mt-4 w-full rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
                  />
                  <textarea
                    value={tratamiento}
                    aria-label="Tratamiento"
                    onChange={(e) => setTratamiento(e.target.value)}
                    rows={2}
                    placeholder="Tratamiento realizado (obligatorio)"
                    className="mt-3 w-full rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
                  />
                  <textarea
                    value={nota}
                    aria-label="Notas"
                    onChange={(e) => setNota(e.target.value)}
                    rows={3}
                    placeholder="Notas: indicaciones y próximo control (opcional)"
                    className="mt-3 w-full rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3 shrink-0" aria-hidden="true" /> El texto se guarda
                    cifrado (AES-256) y solo el paciente y tú pueden verlo.
                  </p>
                  <button
                    onClick={() => void guardarNota()}
                    disabled={guardandoNota}
                    className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {guardandoNota ? "Guardando…" : "Guardar historia clínica"}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AppShell>
  );
}

function Kpi({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 240, damping: 26 }}
      className="rounded-3xl border border-border bg-card p-5"
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </motion.div>
  );
}
