import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CalendarClock,
  FileDown,
  FileText,
  Lock,
  ShieldAlert,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StrikeMeter } from "@/components/StrikeMeter";
import { getDentist, soles } from "@/lib/mock-data";
import {
  statusClass,
  statusLabel,
  useAppState,
  type Appointment,
} from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/panel")({
  head: () => ({
    meta: [
      { title: "Mi panel del paciente | OdontoSystem" },
      {
        name: "description",
        content:
          "Revisa tus tratamientos realizados, el total invertido en soles, tu nivel de puntualidad y tu historial clínico cifrado.",
      },
      { property: "og:title", content: "Mi panel del paciente | OdontoSystem" },
      {
        property: "og:description",
        content: "Métricas, historial clínico y próximas citas del paciente en OdontoSystem.",
      },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { patient, strikes, isBanned, appointments, updateAppointment } = useAppState();
  const [ficha, setFicha] = React.useState<Appointment | null>(null);
  const [tab, setTab] = React.useState<"futuras" | "pasadas">("futuras");

  const completadas = appointments.filter((a) => a.status === "COMPLETED");
  const invertido = completadas.reduce((s, a) => s + a.amount, 0);
  const canceladas = appointments.filter(
    (a) => a.status === "CANCELLED" || a.status === "NO_SHOW",
  ).length;

  const futuras = appointments.filter((a) =>
    ["CONFIRMED", "VERIFYING", "PENDING_PAYMENT"].includes(a.status),
  );
  const pasadas = appointments.filter((a) =>
    ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status),
  );
  const lista = tab === "futuras" ? futuras : pasadas;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Hola de nuevo,</p>
        <h1 className="font-display text-3xl font-semibold">{patient}</h1>
      </motion.div>

      <AnimatePresence>
        {isBanned && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  Cuenta suspendida temporalmente por inasistencias
                </p>
                <p className="text-sm text-muted-foreground">
                  No podrás generar nuevas reservas hasta recuperar tu nivel de puntualidad.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Sparkles className="size-5" />}
          label="Tratamientos realizados"
          value={String(completadas.length)}
          delay={0}
        />
        <Metric
          icon={<Wallet className="size-5" />}
          label="Total invertido"
          value={soles(invertido)}
          delay={0.06}
        />
        <Metric
          icon={<AlertTriangle className="size-5" />}
          label="Citas canceladas / ausencias"
          value={String(canceladas)}
          delay={0.12}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-3xl border border-border bg-card p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nivel de puntualidad
          </p>
          <div className="mt-3">
            <StrikeMeter strikes={strikes} />
          </div>
        </motion.div>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-1 border-b border-border p-2">
          {(["futuras", "pasadas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors"
            >
              {tab === t && (
                <motion.span
                  layoutId="panel-tab"
                  className="absolute inset-0 rounded-full bg-primary/12"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={cn("relative", tab === t ? "text-primary" : "text-muted-foreground")}>
                Citas {t}
              </span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-border">
          <AnimatePresence mode="popLayout">
            {lista.map((a) => {
              const d = getDentist(a.dentistId);
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-wrap items-center gap-4 p-5"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 font-display text-sm font-semibold text-primary">
                    {d?.initials}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{a.service}</p>
                    <p className="text-sm text-muted-foreground">
                      {d?.name} · {a.date} · {a.time}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusClass[a.status],
                    )}
                  >
                    {statusLabel[a.status]}
                  </span>
                  <span className="font-display font-semibold">{soles(a.amount)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFicha(a)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                    >
                      <FileText className="mr-1 inline size-3.5" />
                      Ver ficha
                    </button>
                    {tab === "futuras" &&
                      (isBanned ? (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                          <Lock className="size-3.5" /> Bloqueado
                        </span>
                      ) : (
                        <button
                          onClick={() => updateAppointment(a.id, { status: "CANCELLED" })}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                        >
                          <CalendarClock className="mr-1 inline size-3.5" />
                          Reprogramar / Cancelar
                        </button>
                      ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {lista.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No tienes citas {tab}.{" "}
              <Link to="/paciente/catalogo" className="font-semibold text-primary">
                Buscar un dentista
              </Link>
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {ficha && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={() => setFicha(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Historial clínico</h2>
                  <p className="text-sm text-muted-foreground">
                    {ficha.date} · {ficha.time} · {getDentist(ficha.dentistId)?.name}
                  </p>
                </div>
                <button
                  onClick={() => setFicha(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>

              <p className="mt-4 flex items-center gap-2 rounded-xl bg-success/12 px-3 py-2 text-xs font-medium text-success-foreground">
                <Lock className="size-3.5" /> Nota desencriptada en tiempo real (AES-256)
              </p>

              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                {ficha.note ?? "Esta cita aún no tiene una nota clínica registrada."}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-border p-4 text-sm">
                <span className="text-muted-foreground">Monto pagado</span>
                <span className="font-display text-lg font-semibold">{soles(ficha.amount)}</span>
              </div>

              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground">
                <FileDown className="size-4" /> Descargar ficha en PDF
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Metric({
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
