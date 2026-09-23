import * as React from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  FlaskConical,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Smartphone,
  TimerOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrArt } from "@/components/ChatbotWidget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

type AgendarSearch = { fecha?: string | undefined; hora?: string | undefined };

export const Route = createFileRoute("/paciente/agendar/$id")({
  validateSearch: (search: Record<string, unknown>): AgendarSearch => ({
    fecha: typeof search["fecha"] === "string" ? search["fecha"] : undefined,
    hora: typeof search["hora"] === "string" ? search["hora"] : undefined,
  }),
  loader: ({ params }) => {
    const dentist = getDentist(params.id);
    if (!dentist) throw notFound();
    return { dentist };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.dentist.name ?? "tu odontólogo";
    const desc = `Checkout sandbox con ${name}: pago de garantía del 20% con tarjeta (Culqi/Niubiz) o billetera digital (Yape/Plin). La agenda se bloquea automáticamente.`;
    return {
      meta: [
        { title: `Checkout — cita con ${name} | OdontoSystem` },
        { name: "description", content: desc },
        { property: "og:title", content: `Checkout — cita con ${name} | OdontoSystem` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Agendar,
});

const HOLD_SECONDS = 600;
const pasos = ["Horario", "Pago de garantía", "Comprobante"];

function Agendar() {
  const { dentist } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { addAppointment } = useAppState();

  const days = React.useMemo(() => nextDays(7), []);
  const initialDay = React.useMemo(() => {
    const idx = days.findIndex((d) => d.toISOString().slice(0, 10) === search.fecha);
    return idx >= 0 ? idx : 0;
  }, [days, search.fecha]);

  const [dayIndex, setDayIndex] = React.useState(initialDay);
  const [time, setTime] = React.useState<string | null>(search.hora ?? null);
  const [service, setService] = React.useState(dentist.services[0]?.name ?? "Evaluación");
  const preseleccionado = Boolean(search.fecha && search.hora);
  const [step, setStep] = React.useState(preseleccionado ? 2 : 1);
  const [secondsLeft, setSecondsLeft] = React.useState(HOLD_SECONDS);
  const [expired, setExpired] = React.useState(false);
  const [metodoPago, setMetodoPago] = React.useState<"billetera" | "tarjeta">("billetera");
  const [billetera, setBilletera] = React.useState<"yape" | "plin">("yape");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const busy = busyBlocks[dentist.id] ?? [];
  const holdActive = step >= 2 && !done && !expired;

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
  const precioServicio =
    dentist.services.find((s) => s.name === service)?.price ?? dentist.price;
  const garantia = Math.max(20, Math.round(precioServicio * 0.2));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const confirmarBilletera = () => {
    setEnviando(true);
    window.setTimeout(() => {
      addAppointment({
        id: `n${Date.now()}`,
        dentistId: dentist.id,
        patient: "Nicole Ramírez",
        date: fechaISO,
        time: time ?? "09:00",
        service,
        amount: precioServicio,
        status: "VERIFYING",
        voucher: {
          method: billetera,
          reference: `OP ${Math.floor(1000000 + Math.random() * 8999999)}`,
          amount: garantia,
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

  const confirmarTarjeta = () => {
    setEnviando(true);
    window.setTimeout(() => {
      addAppointment({
        id: `n${Date.now()}`,
        dentistId: dentist.id,
        patient: "Nicole Ramírez",
        date: fechaISO,
        time: time ?? "09:00",
        service,
        amount: precioServicio,
        status: "CONFIRMED",
      });
      setEnviando(false);
      setDone(true);
    }, 1600);
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

      <h1 className="mt-4 font-display text-3xl font-semibold">Checkout — {dentist.name}</h1>

      {/* Alerta Sandbox */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Alert className="mt-4 rounded-2xl border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <FlaskConical className="size-4" />
          <AlertTitle className="font-semibold">Entorno Sandbox</AlertTitle>
          <AlertDescription>
            No se realizarán cargos reales. Al confirmar el pago de garantía, la agenda del
            especialista se bloqueará de forma automática (modelo Admin-less, sin intervención
            de un administrador).
          </AlertDescription>
        </Alert>
      </motion.div>

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
                    color: active
                      ? "var(--color-primary-foreground)"
                      : "var(--color-muted-foreground)",
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

      {/* Countdown */}
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
                  Tu cupo está bloqueado por{" "}
                  <span className="font-display text-lg font-bold tabular-nums">{mmss}</span>{" "}
                  mientras completas el pago.
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
        <div className="rounded-3xl border border-emerald-100 bg-card p-6 shadow-sm">
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
                <Button
                  onClick={() => navigate({ to: "/paciente/catalogo" })}
                  className="mt-6 rounded-full"
                >
                  Volver al catálogo
                </Button>
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
                <h2 className="mt-4 font-display text-xl font-semibold">
                  {metodoPago === "tarjeta" ? "Pago aprobado (Sandbox)" : "Comprobante recibido"}
                </h2>
                <span
                  className={cn(
                    "mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold",
                    metodoPago === "tarjeta"
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-warning/40 bg-warning/15 text-warning-foreground",
                  )}
                >
                  {metodoPago === "tarjeta" ? "CONFIRMED · Agenda bloqueada" : "Verificando pago"}
                </span>
                <p className="mt-3 text-sm text-muted-foreground">
                  {fechaLarga} · {time} con {dentist.name}.
                  {metodoPago === "tarjeta"
                    ? " El bloque horario quedó reservado automáticamente."
                    : " Al validarse tu comprobante la cita pasa a CONFIRMED."}
                </p>
                <Button asChild className="mt-6 rounded-full">
                  <Link to="/paciente/panel">Ir a mi panel</Link>
                </Button>
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

                <Label className="mt-5 block text-sm">
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
                </Label>

                <Button
                  disabled={!time}
                  onClick={() => setStep(2)}
                  className="mt-6 w-full rounded-full"
                >
                  Bloquear cupo y continuar al pago
                </Button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">
                  2. Pago de garantía · {soles(garantia)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (20% de {soles(precioServicio)})
                  </span>
                </h2>

                <RadioGroup
                  value={metodoPago}
                  onValueChange={(v) => setMetodoPago(v as "billetera" | "tarjeta")}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <Label
                    htmlFor="mp-billetera"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                      metodoPago === "billetera"
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <RadioGroupItem id="mp-billetera" value="billetera" className="mt-0.5" />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <Smartphone className="size-4 text-primary" /> Billetera Digital
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Yape o Plin con comprobante (QR)
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor="mp-tarjeta"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                      metodoPago === "tarjeta"
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <RadioGroupItem id="mp-tarjeta" value="tarjeta" className="mt-0.5" />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <CreditCard className="size-4 text-primary" /> Tarjeta
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Culqi / Niubiz (Visa, Mastercard)
                      </span>
                    </span>
                  </Label>
                </RadioGroup>

                <AnimatePresence mode="wait">
                  {metodoPago === "billetera" ? (
                    <motion.div
                      key="billetera"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <div className="mt-4 flex gap-2">
                        {(["yape", "plin"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setBilletera(m)}
                            className={cn(
                              "flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition-colors",
                              billetera === m
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-6 text-center">
                        <QrArt />
                        <p className="mt-3 font-display text-lg font-semibold">956 402 118</p>
                        <p className="text-sm text-muted-foreground">
                          {billetera === "yape" ? "Yape" : "Plin"} · OdontoSystem SAC ·{" "}
                          {soles(garantia)}
                        </p>
                      </div>
                      <Button onClick={() => setStep(3)} className="mt-5 w-full rounded-full">
                        Ya pagué, subir comprobante
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tarjeta"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-4 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="cc-num">Número de tarjeta</Label>
                        <Input
                          id="cc-num"
                          inputMode="numeric"
                          placeholder="4242 4242 4242 4242"
                          defaultValue="4242 4242 4242 4242"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cc-exp">Vencimiento</Label>
                          <Input id="cc-exp" placeholder="MM/AA" defaultValue="12/28" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cc-cvv">CVV</Label>
                          <Input id="cc-cvv" placeholder="123" defaultValue="123" className="rounded-xl" />
                        </div>
                      </div>
                      <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                        Tarjeta de prueba Sandbox precargada. El cargo de {soles(garantia)} es
                        simulado.
                      </p>
                      <Button
                        disabled={enviando}
                        onClick={confirmarTarjeta}
                        className="w-full rounded-full"
                      >
                        {enviando && <Loader2 className="size-4 animate-spin" />}
                        {enviando ? "Procesando pago…" : `Pagar ${soles(garantia)} y confirmar`}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">3. Adjunta tu comprobante</h2>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/60">
                  <ImagePlus className="size-8 text-primary" />
                  <span className="text-sm font-medium">
                    Sube la captura del {billetera === "yape" ? "Yape" : "Plin"}
                  </span>
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
                      <img
                        src={preview}
                        alt="Vista previa del comprobante"
                        className="max-h-64 w-full object-contain"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  disabled={!preview || enviando}
                  onClick={confirmarBilletera}
                  className="mt-6 w-full rounded-full"
                >
                  {enviando && <Loader2 className="size-4 animate-spin" />}
                  {enviando ? "Enviando comprobante…" : "Enviar para verificación"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resumen de la cita */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-3 rounded-3xl border border-emerald-100 bg-card p-6 text-sm shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldCheck className="size-5 text-primary" /> Resumen de la cita
            </h2>
            <Row label="Especialista" value={dentist.name} />
            <Row label="Servicio" value={service} />
            <Row label="Fecha" value={fechaLarga} />
            <Row label="Hora" value={time ?? "—"} />
            <Row label="Total del servicio" value={soles(precioServicio)} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">Garantía (20%)</span>
              <span className="font-display text-lg font-semibold text-primary">
                {soles(garantia)}
              </span>
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              La garantía se descuenta del total en consulta. Si no subes el comprobante a tiempo,
              el cupo se libera automáticamente.
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
