import * as React from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  FlaskConical,
  Loader2,
  LogIn,
  ShieldCheck,
  Smartphone,
  TimerOff,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QrArt } from "@/components/ChatbotWidget";
import { SelectorTurnos } from "@/components/SelectorTurnos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { soles } from "@/lib/mock-data";
import {
  ApiError,
  citasApi,
  odontologosApi,
  type Cita,
  type MetodoPago,
  type Pago,
} from "@/lib/api";
import { fechaDe, fechaLarga, horaDe } from "@/lib/odontologos";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

type AgendarSearch = { servicio?: string | undefined; inicio?: string | undefined };

export const Route = createFileRoute("/paciente/agendar/$id")({
  validateSearch: (search: Record<string, unknown>): AgendarSearch => ({
    servicio: typeof search["servicio"] === "string" ? search["servicio"] : undefined,
    inicio: typeof search["inicio"] === "string" ? search["inicio"] : undefined,
  }),
  loader: async ({ params }) => {
    try {
      return { perfil: await odontologosApi.perfil(params.id) };
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) throw notFound();
      throw e;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.perfil.nombre ?? "tu odontÃ³logo";
    const desc = `Reserva con ${name}: aparta el turno y paga el depÃ³sito con tarjeta, Yape o Plin (sandbox).`;
    return {
      meta: [
        { title: `Reservar cita con ${name} | OdontoSystem` },
        { name: "description", content: desc },
        { property: "og:title", content: `Reservar cita con ${name} | OdontoSystem` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: Agendar,
});

const pasos = ["Horario", "Pago del depÃ³sito", "ConfirmaciÃ³n"];

function Agendar() {
  const { perfil } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { usuario } = useAppState();

  const servicios = perfil.servicios.filter((s) => s.activo);
  const [servicioId, setServicioId] = React.useState(
    servicios.some((s) => s.id === search.servicio) ? search.servicio! : (servicios[0]?.id ?? ""),
  );
  const [inicio, setInicio] = React.useState<string | null>(search.inicio ?? null);
  const [recargar, setRecargar] = React.useState(0);

  const [cita, setCita] = React.useState<Cita | null>(null);
  const [pago, setPago] = React.useState<Pago | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);
  const [segundos, setSegundos] = React.useState(0);
  const [metodoPago, setMetodoPago] = React.useState<"billetera" | "tarjeta">("billetera");
  const [billetera, setBilletera] = React.useState<"yape" | "plin">("yape");

  const servicio = servicios.find((s) => s.id === servicioId);
  const step = pago ? 3 : cita ? 2 : 1;
  const esPaciente = usuario?.rol === "PACIENTE";
  const deposito = Number(cita?.deposito_requerido ?? servicio?.monto_deposito ?? 0);
  const precio = Number(cita?.precio ?? servicio?.precio_total ?? 0);
  const inicioCita = cita?.inicio ?? inicio;

  // Cuenta regresiva hasta "pagar_antes_de": despuÃ©s el backend libera el turno solo
  React.useEffect(() => {
    if (!cita?.pagar_antes_de || pago) return;
    const limite = new Date(cita.pagar_antes_de).getTime();
    const tic = () => {
      const quedan = Math.max(0, Math.round((limite - Date.now()) / 1000));
      setSegundos(quedan);
      if (quedan === 0) setExpired(true);
    };
    tic();
    const t = window.setInterval(tic, 1000);
    return () => window.clearInterval(t);
  }, [cita, pago]);

  const holdActive = step === 2 && !expired;
  const total = 15 * 60;
  const mmss = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
  const pct = Math.min(100, (segundos / total) * 100);

  const mensajeError = (e: unknown, porDefecto: string) => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403))
      return "Tu sesiÃ³n expirÃ³ o no es de paciente. Vuelve a iniciar sesiÃ³n.";
    return e instanceof ApiError ? e.message : porDefecto;
  };

  const bloquearCupo = async () => {
    if (!inicio || !servicioId) return;
    setEnviando(true);
    setError(null);
    try {
      setCita(await citasApi.reservar(perfil.id, servicioId, inicio));
    } catch (e) {
      setError(mensajeError(e, "No se pudo reservar el turno."));
      if (e instanceof ApiError && e.status === 409) {
        // Otro paciente lo tomÃ³: se vuelve a pedir la lista de turnos
        setInicio(null);
        setRecargar((n) => n + 1);
      }
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async (metodo: MetodoPago) => {
    if (!cita) return;
    setEnviando(true);
    setError(null);
    try {
      setPago(await citasApi.pagar(cita.id, metodo));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setExpired(true);
      setError(mensajeError(e, "No se pudo procesar el pago."));
    } finally {
      setEnviando(false);
    }
  };

  const confirmada = pago?.cita.estado === "CONFIRMADA";

  return (
    <AppShell>
      <Link
        to="/paciente/dentista/$id"
        params={{ id: perfil.id }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al perfil
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold">Reservar con {perfil.nombre}</h1>

      {/* Alerta Sandbox */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Alert className="mt-4 rounded-2xl border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <FlaskConical className="size-4" />
          <AlertTitle className="font-semibold">Entorno Sandbox</AlertTitle>
          <AlertDescription>
            No se realizarÃ¡n cargos reales: el pago lo aprueba una pasarela simulada. Al pagar el
            depÃ³sito, el turno queda bloqueado en la agenda del especialista sin intervenciÃ³n de un
            administrador.
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
                  Tu turno estÃ¡ apartado por{" "}
                  <span className="font-display text-lg font-bold tabular-nums">{mmss}</span>{" "}
                  mientras pagas el depÃ³sito.
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
        <div className="rounded-3xl border border-mint/60 bg-card p-6 shadow-sm">
          {error && !expired && (
            <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <AnimatePresence mode="wait">
            {!esPaciente ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <LogIn className="size-8" />
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold">
                  Inicia sesiÃ³n como paciente para reservar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {usuario
                    ? "Tu cuenta es de odontÃ³logo: las reservas se hacen con una cuenta de paciente."
                    : "Necesitamos saber quiÃ©n reserva para enviarte la confirmaciÃ³n y los recordatorios."}
                </p>
                <Button asChild className="mt-6 rounded-full">
                  <Link to="/">Ir a iniciar sesiÃ³n</Link>
                </Button>
              </motion.div>
            ) : expired ? (
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
                  Tu tiempo de reserva venciÃ³
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  El turno se liberÃ³ automÃ¡ticamente. Elige nuevamente tu horario.
                </p>
                <Button
                  onClick={() =>
                    navigate({ to: "/paciente/dentista/$id", params: { id: perfil.id } })
                  }
                  className="mt-6 rounded-full"
                >
                  Elegir otro horario
                </Button>
              </motion.div>
            ) : pago ? (
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
                  {confirmada ? "Â¡Cita confirmada!" : "Pago recibido"}
                </h2>
                <span
                  className={cn(
                    "mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold",
                    confirmada
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-warning/40 bg-warning/15 text-warning-foreground",
                  )}
                >
                  {confirmada
                    ? "CONFIRMADA Â· Agenda bloqueada"
                    : "Esperando confirmaciÃ³n del odontÃ³logo"}
                </span>
                <p className="mt-3 text-sm text-muted-foreground">
                  {fechaLarga(fechaDe(pago.cita.inicio))} Â· {horaDe(pago.cita.inicio)} con{" "}
                  {perfil.nombre}.
                  {confirmada
                    ? " Te enviamos la confirmaciÃ³n por correo y te recordaremos la cita antes."
                    : " Te avisaremos por correo cuando el odontÃ³logo la confirme."}
                </p>
                {pago.numero_operacion && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    OperaciÃ³n {pago.numero_operacion}
                  </p>
                )}
                <Button asChild className="mt-6 rounded-full">
                  <Link to="/paciente/panel">Ir a mi panel</Link>
                </Button>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="mb-4 font-display text-lg font-semibold">
                  1. Elige servicio, fecha y hora
                </h2>
                {servicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este odontÃ³logo todavÃ­a no publicÃ³ servicios.
                  </p>
                ) : (
                  <SelectorTurnos
                    odontologoId={perfil.id}
                    servicios={servicios}
                    servicioId={servicioId}
                    onServicio={setServicioId}
                    inicio={inicio}
                    onInicio={setInicio}
                    recargar={recargar}
                  />
                )}
                <Button
                  disabled={!inicio || enviando}
                  onClick={bloquearCupo}
                  className="mt-6 w-full rounded-full"
                >
                  {enviando && <Loader2 className="size-4 animate-spin" />}
                  {enviando ? "Apartando turnoâ€¦" : "Apartar turno y continuar al pago"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">
                  2. DepÃ³sito Â· {soles(deposito)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (del total de {soles(precio)})
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
                        Yape o Plin
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
                        Visa o Mastercard
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
                                            <div className="mb-6">
  <div className="grid gap-4 sm:grid-cols-2">
    {["yape", "plin"].map((m) => (
      <label key={m} className={cn(
        "flex flex-col items-center rounded-2xl border p-4 text-center transition-all hover:shadow-md",
        billetera === m
          ? "border-[#00E5C2] bg-[#E0FEFE]/50"
          : "border-border bg-muted/20"
      )}>
        <img src={`/${m}.png`} alt={m.toUpperCase()} className="h-10 w-auto mb-2" />
        <span className="font-semibold text-sm capitalize">{m}</span>
        <input type="radio" name="billetera" checked={billetera===m} onChange={()=>setBilletera(m)} className="sr-only" />
      </label>
    ))}
  </div>
</div>
                                            <div className="mb-4 rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
  <QrArt />
  <p className="mt-4 text-sm text-muted-foreground">
    Escanea el código desde tu aplicación y verifica el importe antes de pagar
  </p>
  <div className="mt-6 space-y-2 text-left">
    <div className="flex justify-between">
      <span className="text-muted-foreground">Depósito:</span>
      <span className="font-mono">{soles(deposito)}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Total cita:</span>
      <span className="font-mono">{soles(precio)}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Método:</span>
      <span className="font-mono capitalize">{billetera}</span>
    </div>
  </div>
  {error ? (
    <p className="mt-3 text-sm text-destructive">{error}</p>
  ) : enviando ? (
    <p className="mt-3 text-sm text-muted-foreground">Verificando pago…</p>
  ) : (
    <p className="mt-3 text-sm text-muted-foreground">Estado: Pendiente</p>
  )}
</div>
                      <Button
                        disabled={enviando}
                        onClick={() => pagar(billetera === "yape" ? "YAPE" : "PLIN")}
                        className="mt-5 w-full rounded-full"
                      >
                        {enviando && <Loader2 className="size-4 animate-spin" />}
                        {enviando ? "Verificando pagoâ€¦" : `Ya paguÃ© ${soles(deposito)}`}
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
                        <Label htmlFor="cc-num">NÃºmero de tarjeta</Label>
                        <Input
                          id="cc-num"
                          inputMode="numeric"
                          defaultValue="4242 4242 4242 4242"
                          className="rounded-xl"
                          readOnly
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cc-exp">Vencimiento</Label>
                          <Input id="cc-exp" defaultValue="12/28" className="rounded-xl" readOnly />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cc-cvv">CVV</Label>
                          <Input id="cc-cvv" defaultValue="123" className="rounded-xl" readOnly />
                        </div>
                      </div>
                      <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                        Tarjeta de prueba del sandbox. El cargo de {soles(deposito)} es simulado: no
                        escribas datos de una tarjeta real.
                      </p>
                      <Button
                        disabled={enviando}
                        onClick={() => pagar("TARJETA")}
                        className="w-full rounded-full"
                      >
                        {enviando && <Loader2 className="size-4 animate-spin" />}
                        {enviando ? "Procesando pagoâ€¦" : `Pagar ${soles(deposito)} y confirmar`}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resumen de la cita */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-3 rounded-3xl border border-mint/60 bg-card p-6 text-sm shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldCheck className="size-5 text-primary" /> Resumen de la cita
            </h2>
            <Row label="Especialista" value={perfil.nombre} />
            {perfil.consultorio && <Row label="Consultorio" value={perfil.consultorio} />}
            <Row label="Servicio" value={servicio?.titulo ?? "â€”"} />
            <Row label="Fecha" value={inicioCita ? fechaLarga(fechaDe(inicioCita)) : "â€”"} />
            <Row label="Hora" value={inicioCita ? horaDe(inicioCita) : "â€”"} />
            <Row label="Total del servicio" value={soles(precio)} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">DepÃ³sito</span>
              <span className="font-display text-lg font-semibold text-primary">
                {soles(deposito)}
              </span>
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              El depÃ³sito se descuenta del total en tu consulta. Si cancelas con 12 horas o mÃ¡s de
              anticipaciÃ³n, se te devuelve.
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

