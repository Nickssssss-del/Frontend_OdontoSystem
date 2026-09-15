import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { ingresosMensuales, soles, timeBlocks } from "@/lib/mock-data";
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
  const { agenda, updateAgenda, addStrike, strikes, blockedToday, setBlockedToday } = useAppState();
  const [notaFor, setNotaFor] = React.useState<Appointment | null>(null);
  const [nota, setNota] = React.useState("");

  const atendidas = agenda.filter((a) => a.status === "COMPLETED").length;
  const ingresosMes = ingresosMensuales.at(-1)?.ingresos ?? 0;
  const ocupacion = Math.round((agenda.length / timeBlocks.length) * 100);

  const marcarAtendido = (a: Appointment) => {
    updateAgenda(a.id, { status: "COMPLETED" });
    setNotaFor({ ...a, status: "COMPLETED" });
    setNota("");
  };

  const registrarAusencia = (a: Appointment) => {
    updateAgenda(a.id, { status: "NO_SHOW" });
    addStrike();
    toast.warning("Inasistencia registrada", {
      description: `Se aplicó un strike automático a ${a.patient} (${strikes + 1}/3).`,
    });
  };

  const guardarNota = () => {
    if (notaFor) updateAgenda(notaFor.id, { note: nota });
    setNotaFor(null);
    toast.success("Nota clínica guardada", {
      description: "El texto se almacenó cifrado con AES-256.",
    });
  };

  return (
    <AppShell>
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
          value={`${atendidas} / ${agenda.length}`}
          delay={0.06}
        />
        <Kpi
          icon={<Activity className="size-5" />}
          label="Tasa de ocupación"
          value={`${ocupacion}%`}
          delay={0.12}
        />
      </div>

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
          <h2 className="font-display text-lg font-semibold">Cronograma de hoy · 15 Set</h2>
          <div className="mt-4 space-y-2">
            {timeBlocks.map((t) => {
              const cita = agenda.find((a) => a.time === t);
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
                        <p className="mt-2 rounded-xl bg-muted/60 p-2 text-xs text-muted-foreground">
                          🔒 {cita.note}
                        </p>
                      )}
                      {["CONFIRMED", "VERIFYING", "PENDING_PAYMENT"].includes(cita.status) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => marcarAtendido(cita)}
                            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            <CheckCircle2 className="mr-1 inline size-3.5" />
                            Marcar como atendido
                          </button>
                          <button
                            onClick={() => registrarAusencia(cita)}
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
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={6}
                placeholder="Procedimiento realizado, indicaciones y próximo control…"
                className="mt-4 w-full rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                🔒 El texto se guarda cifrado (AES-256) y solo el paciente y tú pueden verlo.
              </p>
              <button
                onClick={guardarNota}
                className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Guardar nota
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
