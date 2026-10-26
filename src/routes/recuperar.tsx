// Recuperación de contraseña — pantalla dividida coherente con el login de
// OdontoSystem: panel teal de marca (logo original, titular, diente 3D con
// escudo e indicadores de seguridad) a la izquierda y tarjeta blanca con el
// flujo real de 4 pasos a la derecha:
//   1. Correo → 2. Verificación → 3. Nueva contraseña → 4. Confirmación
// Contrato real del backend (recuperacionApi en src/lib/api.ts):
//   POST /api/auth/recuperar-password   { correo }                         -> 202
//   POST /api/auth/restablecer-password { correo, codigo, password_nueva } -> 204
// El backend no tiene un paso "verificar" aparte: el código se valida al
// restablecer, así que el paso 2 solo comprueba que sean 6 dígitos y el
// código incorrecto/vencido (400) devuelve al paso 2. Jamás se simula el éxito. La contraseña y el código nunca viajan por la URL,
// ni quedan en storage ni en consola; al salir del flujo se limpia todo.

import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { DienteSeguridad } from "@/components/DienteSeguridad";
import { ApiError, recuperacionApi, servicioNoDisponible } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recuperar")({
  head: () => ({
    meta: [
      { title: "OdontoSystem · Recuperar contraseña" },
      {
        name: "description",
        content:
          "Recupera el acceso a tu cuenta de OdontoSystem: solicita un código de verificación por correo y crea una contraseña segura.",
      },
      { property: "og:title", content: "OdontoSystem · Recuperar contraseña" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RecuperarContrasena,
});

const PASOS = ["Correo", "Verificación", "Nueva contraseña", "Confirmación"];
const ESPERA_REENVIO = 60; // segundos entre envíos: límite de solicitudes en el cliente
const CODIGO_LENGTH = 6;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Política de contraseña coherente con el backend: RegistroRequest exige
// @Size(min = 8, max = 100). Aquí se añade complejidad mínima sin superar ese
// máximo, y se aplica por igual en los dos campos del paso 3.
const REQUISITOS = [
  {
    id: "longitud",
    texto: "Entre 8 y 100 caracteres",
    cumple: (c: string) => c.length >= 8 && c.length <= 100,
  },
  { id: "mayuscula", texto: "Una letra mayúscula", cumple: (c: string) => /[A-ZÁÉÍÓÚÑ]/.test(c) },
  { id: "minuscula", texto: "Una letra minúscula", cumple: (c: string) => /[a-záéíóúñ]/.test(c) },
  { id: "numero", texto: "Un número", cumple: (c: string) => /\d/.test(c) },
];

const BOTON_PRINCIPAL =
  "h-12 w-full rounded-xl bg-brand text-base font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand/50";

/** Enmascara el correo para mostrarlo de forma parcialmente oculta. */
function ocultarCorreo(correo: string): string {
  const [local = "", dominio = ""] = correo.split("@");
  if (!dominio) return correo;
  const base = local.slice(0, Math.min(2, local.length));
  return `${base}${"*".repeat(Math.max(3, local.length - base.length))}@${dominio}`;
}

/** Traduce los errores del backend a mensajes claros, discretos y honestos. */
function mensajeRecuperacion(error: unknown): string {
  if (servicioNoDisponible(error)) {
    return "La recuperación de contraseña aún no está habilitada en el servidor. Estamos activando este servicio; inténtalo de nuevo más tarde.";
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Demasiadas solicitudes. Espera unos minutos antes de volver a intentarlo.";
    }
    return error.message;
  }
  return "No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.";
}
/** Mensaje de error discreto pero fácil de identificar. */
function ErrorTexto({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm font-medium text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Mensaje de información/éxito con iconografía clara. */
function AvisoTexto({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-brand/20 bg-sky px-3.5 py-2.5 text-sm text-brand-deep"
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-texto" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Indicadores de seguridad del pie del panel: solo afirmaciones correspondientes
 * a funcionalidades realmente implementadas (HTTPS, verificación de colegiatura
 * COP y consentimiento/tratamiento de datos bajo la Ley N.º 29733).
 */
function IndicadoresSeguridad({ className }: { className?: string }) {
  const items = [
    { icono: <Lock className="size-4" />, texto: "Conexión cifrada" },
    { icono: <ShieldCheck className="size-4" />, texto: "Verificación COP" },
    { icono: <Database className="size-4" />, texto: "Datos protegidos" },
  ];
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium", className)}
    >
      {items.map((item) => (
        <li key={item.texto} className="inline-flex items-center gap-2">
          {item.icono}
          {item.texto}
        </li>
      ))}
    </ul>
  );
}

/**
 * Indicador de progreso horizontal de 4 etapas ligado al estado real:
 * activo en turquesa, completado con marca de éxito y pendiente en gris claro.
 */
function IndicadorProgreso({ paso }: { paso: number }) {
  return (
    <nav aria-label="Progreso de la recuperación" className="mb-7">
      <ol className="flex items-start">
        {PASOS.map((nombre, i) => {
          const completado = i < paso;
          const activo = i === paso;
          const pendiente = !completado && !activo;
          return (
            <li
              key={nombre}
              aria-current={activo ? "step" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1.5",
                i < PASOS.length - 1 && "flex-1",
              )}
            >
              <div className="flex w-full items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      i <= paso ? "bg-success" : "bg-slate-200",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    completado && "border-transparent bg-success/15 text-success",
                    activo && "border-brand bg-brand text-white shadow-lg shadow-brand/30",
                    pendiente && "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {completado ? <Check className="size-4" aria-label="Completado" /> : i + 1}
                </span>
                {i < PASOS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      i < paso ? "bg-success" : "bg-slate-200",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[11px] font-semibold leading-tight sm:block",
                  completado && "text-success",
                  activo && "text-brand-texto",
                  pendiente && "text-slate-500",
                )}
              >
                {nombre}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
function RecuperarContrasena() {
  const navigate = useNavigate();

  // Estado del flujo (solo en memoria: nada sensible en localStorage ni URL).
  const [paso, setPaso] = React.useState(0);
  const [correo, setCorreo] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [clave, setClave] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");
  const [verClave, setVerClave] = React.useState(false);
  const [verConfirmacion, setVerConfirmacion] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [espera, setEspera] = React.useState(0); // segundos restantes para volver a enviar

  // Cuenta regresiva del tiempo de espera entre envíos.
  React.useEffect(() => {
    if (espera <= 0) return;
    const timer = window.setTimeout(() => setEspera((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [espera]);

  const limpiar = () => {
    setPaso(0);
    setCorreo("");
    setCodigo("");
    setClave("");
    setConfirmacion("");
    setVerClave(false);
    setVerConfirmacion(false);
    setEnviando(false);
    setError(null);
    setAviso(null);
    setEspera(0);
  };

  /** Vuelve al login limpiando todo el estado temporal de recuperación. */
  const salir = () => {
    limpiar();
    navigate({ to: "/" });
  };

  /** Paso 1: pide el código de verificación al backend. */
  const solicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando || espera > 0) return;
    const correoLimpio = correo.trim();
    if (!CORREO_REGEX.test(correoLimpio)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await recuperacionApi.solicitar(correoLimpio);
      // Solo se avanza con respuesta satisfactoria del backend; la respuesta es
      // genérica y no revela si la cuenta existe.
      setCodigo("");
      setEspera(ESPERA_REENVIO);
      setAviso(
        "Si el correo pertenece a una cuenta, recibirás un código de verificación en unos minutos.",
      );
      setPaso(1);
    } catch (err) {
      setError(mensajeRecuperacion(err));
    } finally {
      setEnviando(false);
    }
  };

  /** Paso 2: reenvía el código respetando el tiempo de espera. */
  const reenviar = async () => {
    if (enviando || espera > 0) return;
    setError(null);
    setEnviando(true);
    try {
      await recuperacionApi.solicitar(correo.trim());
      setCodigo("");
      setEspera(ESPERA_REENVIO);
      setAviso("Código reenviado. Revisa tu bandeja de entrada y también la carpeta de spam.");
    } catch (err) {
      setError(mensajeRecuperacion(err));
    } finally {
      setEnviando(false);
    }
  };

  /** Paso 2: el backend valida el código al restablecer; aquí solo se exigen los 6 dígitos. */
  const verificar = (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando || codigo.length !== CODIGO_LENGTH) return;
    setError(null);
    setAviso(null);
    setPaso(2);
  };

  /** Paso 2: permite cambiar el correo y volver al inicio del flujo. */
  const cambiarCorreo = () => {
    if (enviando) return;
    setCodigo("");
    setError(null);
    setAviso(null);
    setPaso(0);
  };

  const cumpleRequisitos = REQUISITOS.every((r) => r.cumple(clave));
  const coincideConfirmacion = clave.length > 0 && clave === confirmacion;
  const errorConfirmacion = confirmacion.length > 0 && !coincideConfirmacion;
  const puedeActualizar = cumpleRequisitos && coincideConfirmacion && !enviando;

  /** Paso 3: cambia la contraseña solo con el backend confirmando. */
  const restablecer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.length !== CODIGO_LENGTH) {
      setError("Ingresa el código de 6 dígitos que enviamos a tu correo.");
      setPaso(1);
      return;
    }
    if (!puedeActualizar) return;
    setError(null);
    setEnviando(true);
    try {
      await recuperacionApi.restablecer(correo.trim(), codigo, clave);
      // Limpieza inmediata de los datos sensibles tras la confirmación real.
      setCodigo("");
      setClave("");
      setConfirmacion("");
      setVerClave(false);
      setVerConfirmacion(false);
      setAviso(null);
      setEspera(0);
      setPaso(3);
      toast.success("Contraseña actualizada", {
        description: "Ya puedes iniciar sesión con tus nuevas credenciales.",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Código incorrecto o vencido (5 intentos máx. por código): se vuelve a pedirlo.
        setCodigo("");
        setClave("");
        setConfirmacion("");
        setError(`${err.message} Revisa el código o solicita uno nuevo.`);
        setPaso(1);
      } else {
        setError(mensajeRecuperacion(err));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      {/* ---------- Panel izquierdo: identidad e ilustración (escritorio) ---------- */}
      <section className="hero-teal relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[24rem] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-[26rem] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-24 right-10 size-40 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute left-10 top-1/3 size-24 rounded-full bg-mint/10" />

        {/* Parte superior: logo corporativo original + nombre */}
        <header className="relative flex items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white p-2.5 shadow-lg shadow-black/15 ring-1 ring-black/5">
            <img
              src="/odontosystem-logo.png"
              alt="Logo de OdontoSystem"
              className="size-full object-contain"
            />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight">OdontoSystem</p>
            <p className="text-sm opacity-80">Plataforma dental verificada</p>
          </div>
        </header>

        {/* Zona central: titular + descripción + ilustración 3D */}
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="size-3.5" />
            Recuperación segura de cuenta
          </span>
          <h1 className="mt-5 max-w-lg font-display text-4xl font-bold leading-[1.08] xl:text-5xl">
            Recupera el acceso <span className="text-mint">a tu cuenta</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed opacity-85">
            Te ayudamos a volver lo antes posible a cuidar de tu sonrisa.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
            className="relative mt-6 w-[290px] xl:w-[350px]"
          >
            <DienteSeguridad className="h-auto w-full" />
          </motion.div>
        </div>

        {/* Parte inferior: indicadores de seguridad reales */}
        <footer className="relative">
          <IndicadoresSeguridad className="opacity-90" />
        </footer>
      </section>

      {/* ---------- Panel de marca compacto (tablet/móvil) ---------- */}
      <section className="hero-teal relative overflow-hidden px-6 pb-7 pt-8 text-primary-foreground lg:hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-white/5" />
        <header className="relative flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-lg shadow-black/15 ring-1 ring-black/5">
            <img
              src="/odontosystem-logo.png"
              alt="Logo de OdontoSystem"
              className="size-full object-contain"
            />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight">OdontoSystem</p>
            <p className="text-xs opacity-80">Plataforma dental verificada</p>
          </div>
        </header>
        <h1 className="relative mt-5 font-display text-[1.65rem] font-bold leading-tight">
          Recupera el acceso <span className="text-mint">a tu cuenta</span>
        </h1>
        <p className="relative mt-2 max-w-md text-sm leading-relaxed opacity-85">
          Te ayudamos a volver lo antes posible a cuidar de tu sonrisa.
        </p>
        <div className="relative mx-auto mt-4 w-40 sm:w-52">
          <DienteSeguridad className="h-auto w-full" />
        </div>
      </section>

      {/* ---------- Panel derecho: tarjeta con el formulario ---------- */}
      <section className="decor-glow relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-card via-sky/60 to-card px-4 py-10 sm:px-8">
        <div className="w-full max-w-[680px]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 210, damping: 25 }}
            className="rounded-[24px] border border-white/80 bg-card p-6 shadow-[0_24px_70px_-28px_rgba(0,107,104,0.45)] sm:p-8 lg:p-10"
          >
            {/* Cabecera: sobre en fondo menta suave */}
            {paso < 3 && (
              <div className="mb-6 flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint/30 text-brand-deep ring-1 ring-brand/10">
                  <Mail className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-texto">
                    Recuperación de contraseña
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Paso {paso + 1} de 4 · {PASOS[paso]}
                  </p>
                </div>
              </div>
            )}

            <IndicadorProgreso paso={paso} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={paso}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* ----- Paso 1: correo electrónico ----- */}
                {paso === 0 && (
                  <form onSubmit={solicitar} noValidate className="space-y-5">
                    <div className="space-y-1.5">
                      <h2 className="font-display text-2xl font-bold sm:text-[1.7rem]">
                        Recuperar contraseña
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código
                        de verificación.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="correo">Correo electrónico</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="correo"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="tu@correo.com"
                          className="h-12 rounded-xl pl-10"
                          value={correo}
                          onChange={(e) => {
                            setCorreo(e.target.value);
                            if (error) setError(null);
                          }}
                          aria-invalid={Boolean(error)}
                          disabled={enviando}
                        />
                      </div>
                    </div>

                    {error && <ErrorTexto id="error-paso-1">{error}</ErrorTexto>}

                    <Button
                      type="submit"
                      className={BOTON_PRINCIPAL}
                      disabled={enviando || espera > 0}
                    >
                      {enviando ? (
                        <>
                          <Spinner /> Enviando código…
                        </>
                      ) : (
                        <>
                          Enviar código de verificación <ArrowRight />
                        </>
                      )}
                    </Button>

                    {espera > 0 && !enviando && (
                      <p className="text-center text-xs text-muted-foreground">
                        Podrás solicitar otro código en {espera} s.
                      </p>
                    )}

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={salir}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        <ArrowLeft className="size-4" /> Volver al inicio de sesión
                      </button>
                    </div>
                  </form>
                )}
                {/* ----- Paso 2: verificación del correo ----- */}
                {paso === 1 && (
                  <form onSubmit={verificar} noValidate className="space-y-5">
                    <div className="space-y-1.5">
                      <h2 className="font-display text-2xl font-bold sm:text-[1.7rem]">
                        Verifica tu correo electrónico
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Introduce el código de verificación que te enviamos para continuar.
                      </p>
                    </div>

                    {/* Correo parcialmente oculto */}
                    <div className="flex items-center gap-3 rounded-2xl border border-brand/15 bg-sky px-4 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-deep shadow-sm">
                        <Mail className="size-4" />
                      </span>
                      <p className="min-w-0 text-sm text-brand-deep">
                        Código enviado a{" "}
                        <span className="font-bold break-all">{ocultarCorreo(correo.trim())}</span>
                      </p>
                    </div>

                    {aviso && <AvisoTexto>{aviso}</AvisoTexto>}

                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código de verificación</Label>
                      <InputOTP
                        id="codigo"
                        aria-label="Código de verificación de 6 dígitos"
                        maxLength={CODIGO_LENGTH}
                        value={codigo}
                        onChange={(v) => {
                          setCodigo(v);
                          if (error) setError(null);
                        }}
                        disabled={enviando}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: CODIGO_LENGTH }, (_, i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="h-12 w-11 text-base font-semibold"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="text-xs text-muted-foreground">
                        El código tiene vigencia limitada y solo puede usarse una vez.
                      </p>
                    </div>

                    {error && <ErrorTexto id="error-paso-2">{error}</ErrorTexto>}

                    <Button
                      type="submit"
                      className={BOTON_PRINCIPAL}
                      disabled={enviando || codigo.length !== CODIGO_LENGTH}
                    >
                      {enviando ? (
                        <>
                          <Spinner /> Verificando…
                        </>
                      ) : (
                        <>
                          Verificar código <ArrowRight />
                        </>
                      )}
                    </Button>

                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={cambiarCorreo}
                        disabled={enviando}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        <ArrowLeft className="size-4" /> Cambiar correo
                      </button>
                      <button
                        type="button"
                        onClick={reenviar}
                        disabled={enviando || espera > 0}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        <RefreshCw className="size-4" />
                        {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
                      </button>
                    </div>
                  </form>
                )}
                {/* ----- Paso 3: crear una nueva contraseña ----- */}
                {paso === 2 && (
                  <form onSubmit={restablecer} noValidate className="space-y-5">
                    <div className="space-y-1.5">
                      <h2 className="font-display text-2xl font-bold sm:text-[1.7rem]">
                        Crea una nueva contraseña
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Elige una contraseña segura para proteger tu cuenta.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clave">Nueva contraseña</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="clave"
                          type={verClave ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="h-12 rounded-xl pl-10 pr-12"
                          value={clave}
                          onChange={(e) => setClave(e.target.value)}
                          disabled={enviando}
                        />
                        <button
                          type="button"
                          onClick={() => setVerClave((v) => !v)}
                          aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {verClave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Requisitos de seguridad en vivo */}
                    <ul className="grid gap-2 rounded-2xl border border-brand/15 bg-sky/70 p-4 sm:grid-cols-2">
                      {REQUISITOS.map((requisito) => {
                        const cumple = requisito.cumple(clave);
                        return (
                          <li
                            key={requisito.id}
                            className={cn(
                              "flex items-center gap-2 text-sm font-medium",
                              cumple ? "text-success" : "text-muted-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full",
                                cumple
                                  ? "bg-success/15 text-success"
                                  : "bg-white text-slate-500 ring-1 ring-slate-200",
                              )}
                            >
                              {cumple ? (
                                <Check className="size-3" aria-label="Requisito cumplido" />
                              ) : (
                                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                              )}
                            </span>
                            {requisito.texto}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="space-y-2">
                      <Label htmlFor="confirmacion">Confirmar nueva contraseña</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmacion"
                          type={verConfirmacion ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="h-12 rounded-xl pl-10 pr-12"
                          value={confirmacion}
                          onChange={(e) => setConfirmacion(e.target.value)}
                          aria-invalid={errorConfirmacion}
                          disabled={enviando}
                        />
                        <button
                          type="button"
                          onClick={() => setVerConfirmacion((v) => !v)}
                          aria-label={verConfirmacion ? "Ocultar contraseña" : "Mostrar contraseña"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {verConfirmacion ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      {errorConfirmacion && (
                        <p role="alert" className="text-sm font-medium text-destructive">
                          Las contraseñas no coinciden.
                        </p>
                      )}
                    </div>

                    {error && <ErrorTexto id="error-paso-3">{error}</ErrorTexto>}

                    <Button type="submit" className={BOTON_PRINCIPAL} disabled={!puedeActualizar}>
                      {enviando ? (
                        <>
                          <Spinner /> Actualizando contraseña…
                        </>
                      ) : (
                        <>
                          Actualizar contraseña <ArrowRight />
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* ----- Paso 4: confirmación de éxito ----- */}
                {paso === 3 && (
                  <div className="space-y-5 py-2 text-center">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="mx-auto flex size-20 items-center justify-center rounded-full bg-mint/35 text-brand-deep ring-8 ring-mint/20"
                    >
                      <CheckCircle2 className="size-10" />
                    </motion.span>
                    <div className="space-y-2">
                      <h2 className="font-display text-2xl font-bold sm:text-[1.7rem]">
                        ¡Contraseña actualizada!
                      </h2>
                      <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Tu contraseña se ha cambiado correctamente. Ya puedes iniciar sesión con tus
                        nuevas credenciales.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={salir}
                      className={cn(BOTON_PRINCIPAL, "mx-auto max-w-sm")}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Indicadores de seguridad también en pantallas pequeñas */}
        <IndicadoresSeguridad className="mt-6 justify-center text-[11px] text-muted-foreground lg:hidden" />
      </section>
    </main>
  );
}
