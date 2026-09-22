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
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OdontoSystem · Ingresar a tu cuenta" },
      {
        name: "description",
        content:
          "Inicia sesión o regístrate en OdontoSystem: pacientes y odontólogos independientes con colegiatura COP verificada en Ica, Perú.",
      },
      { property: "og:title", content: "OdontoSystem · Ingresar a tu cuenta" },
      {
        property: "og:description",
        content:
          "Acceso para pacientes y odontólogos independientes con colegiatura COP verificada.",
      },
    ],
  }),
  component: LoginScreen,
});

type Role = "paciente" | "odontologo";
type Mode = "login" | "registro";

function LoginScreen() {
  const navigate = useNavigate();
  const [role, setRole] = React.useState<Role>("paciente");
  const [mode, setMode] = React.useState<Mode>("login");
  const [bio, setBio] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Sesión iniciada", {
      description:
        role === "paciente"
          ? "Bienvenida a tu panel de paciente."
          : "Bienvenida a tu panel de odontólogo.",
    });
    navigate({ to: role === "paciente" ? "/paciente/catalogo" : "/odontologo" });
  };

  const googleLogin = () => {
    toast.success("Continuando con Google");
    navigate({ to: role === "paciente" ? "/paciente/catalogo" : "/odontologo" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden grid-aurora">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        {/* Lado izquierdo — hero/marketing */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="hidden lg:block"
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

        {/* Lado derecho — tarjeta de login/registro */}
        <motion.section
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 26 }}
          className="w-full"
        >
          <Card className="border-border bg-card/90 p-2 shadow-xl backdrop-blur">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <CalendarHeart className="size-5" />
                </span>
                <CardTitle className="font-display text-2xl">
                  Odonto<span className="text-primary">System</span>
                </CardTitle>
              </div>
              <CardDescription className="text-center">
                Ingresa a tu cuenta o crea una nueva
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pestañas Paciente / Odontólogo */}
              <Tabs
                value={role}
                onValueChange={(v) => setRole(v as Role)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paciente" className="gap-1.5">
                    <UserRound className="size-4" /> Paciente
                  </TabsTrigger>
                  <TabsTrigger value="odontologo" className="gap-1.5">
                    <Stethoscope className="size-4" /> Odontólogo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paciente">
                  <AuthForm
                    role="paciente"
                    mode={mode}
                    onModeChange={setMode}
                    onSubmit={submit}
                    onGoogle={googleLogin}
                  />
                </TabsContent>
                <TabsContent value="odontologo">
                  <AuthForm
                    role="odontologo"
                    mode={mode}
                    onModeChange={setMode}
                    onSubmit={submit}
                    onGoogle={googleLogin}
                  />
                </TabsContent>
              </Tabs>

              {/* Biometría */}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
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
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <ChatbotWidget />
    </div>
  );
}

function AuthForm({
  role,
  mode,
  onModeChange,
  onSubmit,
  onGoogle,
}: {
  role: Role;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
}) {
  const isRegistro = mode === "registro";
  return (
    <div className="space-y-4 pt-2">
      {/* Toggle Login / Registro */}
      <div className="flex gap-1 rounded-full bg-muted p-1">
        {(
          [
            { id: "login" as const, label: "Ingresar" },
            { id: "registro" as const, label: "Registrarme" },
          ]
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className="relative flex-1 rounded-full px-3 py-2 text-sm font-semibold"
          >
            {mode === m.id && (
              <motion.span
                layoutId={`mode-pill-${role}`}
                className="absolute inset-0 rounded-full bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={cn(
                "relative flex items-center justify-center",
                mode === m.id ? "text-primary" : "text-muted-foreground",
              )}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        {isRegistro && (
          <div className="space-y-1.5">
            <Label htmlFor={`name-${role}`}>Nombre completo</Label>
            <Input id={`name-${role}`} type="text" required placeholder="Tu nombre y apellido" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`email-${role}`}>Correo electrónico</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`email-${role}`}
              type="email"
              required
              defaultValue="nicole@odontosystem.pe"
              className="pl-10"
              placeholder="tu@correo.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`pass-${role}`}>Contraseña</Label>
          <Input
            id={`pass-${role}`}
            type="password"
            required
            defaultValue="••••••••"
            placeholder="••••••••"
          />
        </div>

        {/* Campo dinámico: N° de colegiatura COP solo para odontólogo en registro (RF08) */}
        {isRegistro && role === "odontologo" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <Label htmlFor={`cop-${role}`}>
              N.º de colegiatura COP <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`cop-${role}`}
              type="text"
              required
              placeholder="Ej. COP-12345"
            />
            <p className="text-xs text-muted-foreground">
              Verificamos tu colegiatura antes de publicar tu perfil.
            </p>
          </motion.div>
        )}

        {!isRegistro && (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        <Button type="submit" className="h-11 w-full gap-2 rounded-full">
          {isRegistro ? "Crear cuenta" : "Ingresar"} <ArrowRight className="size-4" />
        </Button>
      </form>

      {/* Separador */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> o {isRegistro ? "regístrate" : "continúa"} con{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Google (RF16) */}
      <Button
        type="button"
        variant="outline"
        onClick={onGoogle}
        className="h-11 w-full gap-3 rounded-full"
      >
        <GoogleMark /> Continuar con Google
      </Button>
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
