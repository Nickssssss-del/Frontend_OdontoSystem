import * as React from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Smartphone,
  TimerOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrArt } from "@/components/ChatbotWidget";
import {
  busyBlocks,
  diaCorto,
  getDentist,
  mesCorto,
  nextDays,
  soles,
  timeBlocks,
} from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/agendar/$id")({
  loader: ({ params }) => {
    const dentist = getDentist(params.id);
    if (!dentist) throw notFound();
    return { dentist };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.dentist.name ?? "tu odontólogo";
    const desc = `Elige fecha y hora con ${name}, aparta tu cupo por 10 minutos y paga el anticipo con Yape o Plin adjuntando tu comprobante.`;
    return {
      meta: [
        { title: `Agendar cita con ${name} | OdontoSystem` },
        { name: "description", content: desc },
        { property: "og:title", content: `Agendar cita con ${name} | OdontoSystem` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Agendar,
});

const HOLD_SECONDS = 600;
const ANTICIPO = 20;

const pasos = ["Selección", "Cupo apartado", "Pago de anticipo", "Comprobante"];

function Agendar() {
  const { dentist } = Route.useLoaderData();
  const navigate = useNavigate();
  const { addAppointment } = useAppState();

  const days = React.useMemo(() => nextDays(7), []);
  const [dayIndex, setDayIndex] = React.useState(0);
  const [time, setTime] = React.useState<string | null>(null);
  const [service, setService] = React.useState(dentist.services[0]?.name ?? "Evaluación");
  const [step, setStep] = React.useState(1);
  const [secondsLeft, setSecondsLeft] = React.useState(HOLD_SECONDS);
  const [expired, setExpired] = React.useState(false);
  const [metodo, setMetodo] = React.useState<"yape" | "plin">("yape");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const busy = busyBlocks[dentist.id] ?? [];
  const holdActive = step >= 2 && step <= 4 && !done && !expired;

  React.useEffect(() => {
    if (!holdActive) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [holdActive]);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;
  const pct = (secondsLeft / HOLD_SECONDS) * 100;
  const selectedDay = days[dayIndex]!;
  const fechaISO = selectedDay.toISOString().slice(0, 10);
  const fechaLarga = `${diaCorto[selectedDay.getDay()]} ${selectedDay.getDate()} ${
    mesCorto[selectedDay.getMonth()]
  }`;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const confirmar = () => {
    setEnviando(true);
    window.setTimeout(() => {
      addAppointment({
        id: `n${Date.now()}`,
        dentistId: dentist.id,
        patient: "Nicole Ramírez",
        date: fechaISO,
        time: time ?? "09:00",
        service,
        amount: dentist.services.find((s) => s.name === service)?.price ?? dentist.price,
        status: "VERIFYING",
        voucher: {
          method: metodo,
          reference: `OP ${Math.floor(1000000 + Math.random() * 8999999)}`,
          amount: ANTICIPO,
          uploadedAt: new Date().toLocaleString("es-PE", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          ...(preview ? { imageUrl: preview } : {}),
          status: "EN_REVISION",
          attempt: 1,
        },
      });
      setEnviando(false);
      setDone(true);
    }, 1400);
  };

  return (
    <AppShell>
      <Link
        to="/paciente/dentista/$id"
        params={{ id: dentist.id }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al perfil
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold">Agendar con {dentist.name}</h1>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {pasos.map((p, i) => {
          const n = i + 1;
          const active = step >= n && !expired;
          return (
            <React.Fragment key={p}>
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{
                    backgroundColor: active ? "var(--color-primary)" : "var(--color-muted)",
                    color: active ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                  }}
                  className="flex size-7 items-center justify-center rounded-full text-xs font-bold"
                >
                  {n}
                </motion.span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {p}
                </span>
              </div>
              {i < pasos.length - 1 && (
                <div className="h-px flex-1 overflow-hidden bg-border">
                  <motion.div
                    initial={false}
                    animate={{ width: step > n && !expired ? "100%" : "0%" }}
                    className="h-full bg-primary"
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Countdown bar */}
      <AnimatePresence>
        {holdActive && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex size-10 items-center justify-center rounded-full bg-warning/25 text-warning-foreground"
                >
                  <Clock className="size-5" />
                </motion.span>
                <p className="flex-1 text-sm font-medium text-warning-foreground">
                  Tu cupo está reservado por{" "}
                  <span className="font-display text-lg font-bold tabular-nums">{mmss}</span>{" "}
                  minutos mientras realizas el Yape.
                </p>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-warning/20">
                <motion.div
                  className="h-full rounded-full bg-warning"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: "linear", duration: 1 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <AnimatePresence mode="wait">
            {expired ? (
              <motion.div
                key="expired"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <TimerOff className="size-8" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold">
                  Tu tiempo de reserva venció
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  El cupo se liberó automáticamente. Selecciona nuevamente tu horario.
                </p>
                <button
                  onClick={() => navigate({ to: "/paciente/catalogo" })}
                  className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Volver al catálogo
                </button>
              </motion.div>
            ) : done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 text-success"
                >
                  <CheckCircle2 className="size-9" />
                </motion.span>
                <h2 className="mt-4 font-display text-xl font-semibold">Comprobante recibido</h2>
                <span className="mt-3 inline-block rounded-full border border-warning/40 bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                  Verificando pago
                </span>
                <p className="mt-3 text-sm text-muted-foreground">
                  {fechaLarga} · {time} con {dentist.name}. Al validarse tu Yape la cita pasa a
                  CONFIRMED.
                </p>
                <Link
                  to="/paciente/panel"
                  className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Ir a mi panel
                </Link>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">1. Elige fecha y hora</h2>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {days.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDayIndex(i);
                        setTime(null);
                      }}
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 text-sm transition-colors",
                        i === dayIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-[11px] uppercase">{diaCorto[d.getDay()]}</span>
                      <span className="font-display text-lg font-semibold">{d.getDate()}</span>
                      <span className="text-[11px]">{mesCorto[d.getMonth()]}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {timeBlocks.map((t) => {
                    const disabled = busy.includes(t);
                    return (
                      <motion.button
                        key={t}
                        whileTap={{ scale: disabled ? 1 : 0.94 }}
                        disabled={disabled}
                        onClick={() => setTime(t)}
                        className={cn(
                          "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                          disabled
                            ? "cursor-not-allowed border-dashed border-border bg-muted/60 text-muted-foreground/60 line-through"
                            : t === time
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/60",
                        )}
                      >
                        {t}
                      </motion.button>
                    );
                  })}
                </div>

                <label className="mt-5 block text-sm">
                  <span className="mb-1.5 block font-medium text-muted-foreground">Servicio</span>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {dentist.services.map((s) => (
                      <option key={s.name}>{s.name}</option>
                    ))}
                  </select>
                </label>

                <button
                  disabled={!time}
                  onClick={() => setStep(2)}
                  className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Apartar cupo por 10 minutos
                </button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="py-6 text-center"
              >
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary"
                >
                  <ShieldCheck className="size-8" />
                </motion.span>
                <h2 className="mt-4 font-display text-xl font-semibold">Cupo apartado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bloqueamos el bloque {time} del {fechaLarga}. Ningún otro paciente puede tomarlo
                  mientras el temporizador siga activo.
                </p>
                <button
                  onClick={() => setStep(3)}
                  className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Continuar al pago del anticipo
                </button>
              </motion.div>
            ) : step === 3 ? (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">
                  3. Paga el anticipo de {soles(ANTICIPO)}
                </h2>
                <div className="mt-4 flex gap-2">
                  {(["yape", "plin"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodo(m)}
                      className={cn(
                        "flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition-colors",
                        metodo === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <Smartphone className="mr-1.5 inline size-4" />
                      {m}
                    </button>
                  ))}
                </div>

                <motion.div
                  key={metodo}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-2xl border border-border bg-muted/40 p-6 text-center"
                >
                  <QrArt />
                  <p className="mt-3 font-display text-lg font-semibold">956 402 118</p>
                  <p className="text-sm text-muted-foreground">
                    {metodo === "yape" ? "Yape" : "Plin"} · OdontoSystem SAC
                  </p>
                </motion.div>

                <button
                  onClick={() => setStep(4)}
                  className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
                >
                  Ya pagué, subir comprobante
                </button>
              </motion.div>
            ) : (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">4. Adjunta tu comprobante</h2>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/60">
                  <ImagePlus className="size-8 text-primary" />
                  <span className="text-sm font-medium">Sube la captura del Yape/Plin</span>
                  <span className="text-xs text-muted-foreground">PNG o JPG hasta 5 MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>

                <AnimatePresence>
                  {preview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 overflow-hidden rounded-2xl border border-border"
                    >
                      <img src={preview} alt="Vista previa del comprobante" className="max-h-64 w-full object-contain" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  disabled={!preview || enviando}
                  onClick={confirmar}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                >
                  {enviando && <Loader2 className="size-4 animate-spin" />}
                  {enviando ? "Enviando comprobante…" : "Enviar para verificación"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-3 rounded-3xl border border-border bg-card p-6 text-sm">
            <h2 className="font-display text-lg font-semibold">Resumen</h2>
            <Row label="Odontólogo" value={dentist.name} />
            <Row label="Servicio" value={service} />
            <Row label="Fecha" value={fechaLarga} />
            <Row label="Hora" value={time ?? "—"} />
            <Row
              label="Total del servicio"
              value={soles(dentist.services.find((s) => s.name === service)?.price ?? dentist.price)}
            />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">Anticipo por Yape/Plin</span>
              <span className="font-display text-lg font-semibold text-primary">
                {soles(ANTICIPO)}
              </span>
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              Estado de la cita: PENDING_PAYMENT → Verificando pago → CONFIRMED.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
