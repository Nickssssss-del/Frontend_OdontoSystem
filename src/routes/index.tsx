import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CalendarHeart,
  Fingerprint,
  Mail,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OdontoSystem · Marketplace dental en Ica" },
      {
        name: "description",
        content:
          "Reserva con odontólogos colegiados en Ica: agenda por bloques, anticipo por Yape o Plin e historial clínico cifrado. Ingresa con Google, correo o biometría.",
      },
      { property: "og:title", content: "OdontoSystem · Marketplace dental en Ica" },
      {
        property: "og:description",
        content:
          "Marketplace dental de Ica: dentistas verificados por el COP, reserva con temporizador y pagos por Yape/Plin.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [modo, setModo] = React.useState<"paciente" | "dentista">("paciente");
  const [bio, setBio] = React.useState(false);
  const [recuperar, setRecuperar] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);

  const entrar = () =>
    navigate({ to: modo === "paciente" ? "/paciente/catalogo" : "/odontologo" });

  return (
    <div className="relative min-h-screen overflow-hidden grid-aurora">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <CalendarHeart className="size-4 text-primary" /> OdontoSystem v4.3 · Ica, Perú
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05]">
            Tu próxima cita dental,
            <span className="text-primary"> reservada en 3 toques.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Marketplace dental con odontólogos de colegiatura COP verificada, cupos apartados con
            temporizador y anticipo por Yape o Plin.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Colegiatura COP verificada antes de publicar cualquier perfil",
              "Cupo apartado 10 minutos mientras completas tu Yape",
              "Historial clínico cifrado con AES-256, disponible cuando lo pidas",
            ].map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-start gap-2"
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{t}</span>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 26 }}
          className="rounded-3xl border border-border bg-card/90 p-7 shadow-xl backdrop-blur"
        >
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(
              [
                { id: "paciente", label: "Soy paciente", icon: CalendarHeart },
                { id: "dentista", label: "Soy odontólogo", icon: Stethoscope },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setModo(m.id)}
                className="relative flex-1 rounded-full px-3 py-2 text-sm font-semibold"
              >
                {modo === m.id && (
                  <motion.span
                    layoutId="role-pill"
                    className="absolute inset-0 rounded-full bg-card shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex items-center justify-center gap-1.5",
                    modo === m.id ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <m.icon className="size-4" />
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={entrar}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <GoogleMark /> Continuar con Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o con tu correo{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              entrar();
            }}
          >
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">Correo</span>
              <input
                type="email"
                required
                defaultValue="nicole@odontosystem.pe"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted-foreground">Contraseña</span>
              <input
                type="password"
                required
                defaultValue="••••••••"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              onClick={() => setRecuperar(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Iniciar sesión <ArrowRight className="size-4" />
            </motion.button>
          </form>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Fingerprint className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Autenticación biométrica</p>
              <p className="text-xs text-muted-foreground">Huella o FaceID en este dispositivo</p>
            </div>
            <button
              onClick={() => {
                setBio(!bio);
                toast.success(bio ? "Biometría desactivada" : "Biometría activada");
              }}
              aria-label="Activar autenticación biométrica"
              className={cn(
                "flex h-7 w-12 items-center rounded-full p-1 transition-colors",
                bio ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={cn(
                  "size-5 rounded-full bg-card shadow",
                  bio ? "ml-auto" : "mr-auto",
                )}
              />
            </button>
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {recuperar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRecuperar(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-display text-xl font-semibold">Recuperar contraseña</h2>
                <button
                  onClick={() => setRecuperar(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!otpSent ? (
                  <motion.div key="mail" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Te enviaremos un código de 6 dígitos a tu correo.
                    </p>
                    <div className="relative mt-4">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        defaultValue="nicole@odontosystem.pe"
                        className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={() => setOtpSent(true)}
                      className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
                    >
                      Enviar código
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ingresa el código que enviamos a tu correo.
                    </p>
                    <div className="mt-4 flex justify-between gap-2">
                      {otp.map((v, i) => (
                        <input
                          key={i}
                          value={v}
                          maxLength={1}
                          inputMode="numeric"
                          aria-label={`Dígito ${i + 1}`}
                          onChange={(e) =>
                            setOtp((prev) =>
                              prev.map((p, k) => (k === i ? e.target.value.slice(-1) : p)),
                            )
                          }
                          className="h-14 w-full rounded-xl border border-input bg-background text-center font-display text-xl outline-none focus:border-primary"
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setRecuperar(false);
                        setOtpSent(false);
                        toast.success("Código verificado", {
                          description: "Ahora puedes crear una nueva contraseña.",
                        });
                      }}
                      className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
                    >
                      Verificar código
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
