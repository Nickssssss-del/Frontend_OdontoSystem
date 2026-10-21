import * as React from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FlaskConical,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TimerOff,
  User,
  Wallet,
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

type AgendarSearch = {
  servicio?: string | undefined;
  inicio?: string | undefined;
  /** Cita ya reservada (PENDIENTE_PAGO) cuyo depósito falta pagar: salta directo al paso de pago. */
  cita?: string | undefined;
};

export const Route = createFileRoute("/paciente/agendar/$id")({
  validateSearch: (search: Record<string, unknown>): AgendarSearch => ({
    servicio: typeof search["servicio"] === "string" ? search["servicio"] : undefined,
    inicio: typeof search["inicio"] === "string" ? search["inicio"] : undefined,
    cita: typeof search["cita"] === "string" ? search["cita"] : undefined,
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
    const name = loaderData?.perfil.nombre ?? "tu odontólogo";
    const desc = `Reserva con ${name}: aparta el turno y paga el depósito con tarjeta, Yape o Plin (sandbox).`;
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

const pasos = ["Horario", "Pago del depósito", "Confirmación"];

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

  // Llegó con ?cita=: retoma el pago de una reserva que quedó PENDIENTE_PAGO (desde el panel o el chat).
  React.useEffect(() => {
    if (!search.cita || !esPaciente) return;
    let cancelado = false;
    citasApi
      .detalle(search.cita)
      .then((c) => {
        if (cancelado) return;
        if (c.estado === "PENDIENTE_PAGO") {
          setCita(c);
          setServicioId(c.servicio.id);
          setInicio(c.inicio);
        } else {
          setError("Esta cita ya no tiene un pago pendiente.");
        }
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeError(e, "No se pudo abrir la cita."));
      });
    return () => {
      cancelado = true;
    };
  }, [search.cita, esPaciente]);

  // Cuenta regresiva hasta "pagar_antes_de": después el backend libera el turno solo
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
      return "Tu sesión expiró o no es de paciente. Vuelve a iniciar sesión.";
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
        // Otro paciente lo tomó: se vuelve a pedir la lista de turnos
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
            No se realizarán cargos reales: el pago lo aprueba una pasarela simulada. Al pagar el
            depósito, el turno queda bloqueado en la agenda del especialista sin intervención de un
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
                  Tu turno está apartado por{" "}
                  <span className="font-display text-lg font-bold tabular-nums">{mmss}</span>{" "}
                  mientras pagas el depósito.
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
                  Inicia sesión como paciente para reservar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {usuario
                    ? "Tu cuenta es de odontólogo: las reservas se hacen con una cuenta de paciente."
                    : "Necesitamos saber quién reserva para enviarte la confirmación y los recordatorios."}
                </p>
                <Button asChild className="mt-6 rounded-full">
                  <Link to="/">Ir a iniciar sesión</Link>
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
                  Tu tiempo de reserva venció
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  El turno se liberó automáticamente. Elige nuevamente tu horario.
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
                className="py-6"
              >
                {/* Icono de éxito */}
                <div className="flex flex-col items-center text-center">
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                    className="flex size-20 items-center justify-center rounded-full bg-teal-50 text-teal-500 ring-8 ring-teal-50/60"
                  >
                    <CheckCircle2 className="size-11" strokeWidth={1.8} />
                  </motion.span>

                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-4 font-display text-2xl font-bold tracking-tight text-gray-900"
                  >
                    {confirmada ? "¡Cita confirmada!" : "Pago recibido"}
                  </motion.h2>

                  {/* Badge de estado */}
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 }}
                    className={cn(
                      "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold",
                      confirmada
                        ? "border-teal-200 bg-teal-50 text-teal-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    <BadgeCheck className="size-3.5" />
                    {confirmada
                      ? "CONFIRMADA · Agenda bloqueada"
                      : "Esperando confirmación del odontólogo"}
                  </motion.span>
                </div>

                {/* Tarjeta de detalles */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm"
                >
                  {/* Odontólogo */}
                  <div className="flex items-center gap-3 border-b border-teal-50 px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                      <User className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-400">Odontólogo</p>
                      <p className="truncate font-semibold text-gray-800">
                        {pago.cita.odontologo.nombre}
                      </p>
                    </div>
                  </div>

                  {/* Especialidad */}
                  {perfil.especialidades.length > 0 && (
                    <div className="flex items-center gap-3 border-b border-teal-50 px-5 py-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                        <Stethoscope className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-400">Especialidad</p>
                        <p className="truncate font-semibold text-gray-800">
                          {perfil.especialidades.map((e) => e.nombre).join(" · ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Servicio */}
                  <div className="flex items-center gap-3 border-b border-teal-50 px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-400">Servicio</p>
                      <p className="truncate font-semibold text-gray-800">
                        {pago.cita.servicio.titulo}
                      </p>
                    </div>
                  </div>

                  {/* Fecha y hora */}
                  <div className="flex items-center gap-3 border-b border-teal-50 px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                      <Calendar className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-400">Fecha y hora</p>
                      <p className="font-semibold text-gray-800">
                        {fechaLarga(fechaDe(pago.cita.inicio))} · {horaDe(pago.cita.inicio)}
                      </p>
                    </div>
                  </div>

                  {/* Depósito y pago */}
                  <div className="flex items-center gap-3 border-b border-teal-50 px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                      <Wallet className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-400">Depósito pagado</p>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-800">{soles(pago.monto)}</p>
                        <span className="ml-3 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                          {pago.metodo === "TARJETA"
                            ? "Tarjeta"
                            : pago.metodo === "YAPE"
                              ? "Yape"
                              : "Plin"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Total del servicio: {soles(pago.cita.precio)} · el depósito se descuenta en
                        consulta
                      </p>
                    </div>
                  </div>

                  {/* Confirmación por correo — solo cuando fue confirmada por el backend */}
                  {confirmada && (
                    <div className="flex items-center gap-3 px-5 py-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-500">
                        <Mail className="size-4" />
                      </span>
                      <p className="text-sm text-gray-600">
                        Te enviamos la confirmación por correo y te recordaremos antes de tu cita.
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Botones de acción */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 }}
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <Button asChild className="flex-1 rounded-full bg-teal-600 hover:bg-teal-700">
                    <Link to="/paciente/panel">Ir a mi panel</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 rounded-full border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <Link to="/paciente/panel">
                      <Eye className="size-4" />
                      Ver detalles de la cita
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="mb-4 font-display text-lg font-semibold">
                  1. Elige servicio, fecha y hora
                </h2>
                {servicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este odontólogo todavía no publicó servicios.
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
                  {enviando ? "Apartando turno…" : "Apartar turno y continuar al pago"}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="font-display text-lg font-semibold">
                  2. Depósito · {soles(deposito)}{" "}
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
                        <p className="mt-3 text-sm text-muted-foreground">
                          {billetera === "yape" ? "Yape" : "Plin"} · OdontoSystem ·{" "}
                          {soles(deposito)} (simulado)
                        </p>
                      </div>
                      <Button
                        disabled={enviando}
                        onClick={() => pagar(billetera === "yape" ? "YAPE" : "PLIN")}
                        className="mt-5 w-full rounded-full"
                      >
                        {enviando && <Loader2 className="size-4 animate-spin" />}
                        {enviando ? "Verificando pago…" : `Ya pagué ${soles(deposito)}`}
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
                        {enviando ? "Procesando pago…" : `Pagar ${soles(deposito)} y confirmar`}
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
            <Row label="Servicio" value={servicio?.titulo ?? "—"} />
            <Row label="Fecha" value={inicioCita ? fechaLarga(fechaDe(inicioCita)) : "—"} />
            <Row label="Hora" value={inicioCita ? horaDe(inicioCita) : "—"} />
            <Row label="Total del servicio" value={soles(precio)} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">Depósito</span>
              <span className="font-display text-lg font-semibold text-primary">
                {soles(deposito)}
              </span>
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              El depósito se descuenta del total en tu consulta. Si cancelas con 12 horas o más de
              anticipación, se te devuelve.
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
