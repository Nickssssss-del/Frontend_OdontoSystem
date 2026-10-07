// Login/Registro principal: selección de rol con botones, solo "Iniciar sesión"
// y enlace "Regístrate aquí" abajo para alternar a registro.
// Conectado al backend: POST /api/auth/login y POST /api/auth/register (ver src/lib/api.ts).
// El rol con el que se entra lo decide el backend según la cuenta.

import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarHeart,
  Eye,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { ApiError, authApi, type Sesion } from "@/lib/api";
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

const mensajeDeError = (error: unknown) =>
  error instanceof ApiError ? error.message : "Ocurrió un error inesperado. Inténtalo de nuevo.";

type DatosRegistro = {
  nombre_completo: string;
  tipo_documento: "DNI" | "CE";
  numero_documento: string;
  telefono: string;
  correo: string;
  password: string;
  numero_colegiatura: string;
};

const registroVacio: DatosRegistro = {
  nombre_completo: "",
  tipo_documento: "DNI",
  numero_documento: "",
  telefono: "",
  correo: "",
  password: "",
  numero_colegiatura: "",
};

function LoginScreen() {
  const navigate = useNavigate();
  const [role, setRole] = React.useState<Role>("paciente");
  const [mode, setMode] = React.useState<Mode>("login");
  const [showPassword, setShowPassword] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [login, setLogin] = React.useState({ correo: "", password: "" });
  const [registro, setRegistro] = React.useState<DatosRegistro>(registroVacio);

  const campoRegistro =
    (campo: keyof DatosRegistro) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRegistro((r) => ({ ...r, [campo]: e.target.value }));

  const entrar = (sesion: Sesion, titulo: string, descripcion?: string) => {
    toast.success(titulo, {
      description: descripcion ?? `Hola, ${sesion.nombre_completo.split(" ")[0]}.`,
    });
    navigate({
      to: sesion.rol === "ODONTOLOGO" ? "/dentist/dashboard" : "/paciente/catalogo",
    });
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const sesion = await authApi.login(login.correo.trim(), login.password);
      const esOdontologo = sesion.rol === "ODONTOLOGO";
      if (esOdontologo !== (role === "odontologo")) {
        toast.info(
          `Tu cuenta está registrada como ${esOdontologo ? "odontólogo" : "paciente"}; te llevamos a ese panel.`,
        );
      }
      entrar(sesion, "Sesión iniciada");
    } catch (error) {
      toast.error("No se pudo iniciar sesión", { description: mensajeDeError(error) });
    } finally {
      setEnviando(false);
    }
  };

  const submitRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    const esOdontologo = role === "odontologo";
    setEnviando(true);
    try {
      const sesion = await authApi.registrar({
        nombre_completo: registro.nombre_completo.trim(),
        tipo_documento: registro.tipo_documento,
        numero_documento: registro.numero_documento.trim(),
        telefono: registro.telefono.trim(),
        correo: registro.correo.trim(),
        password: registro.password,
        rol: esOdontologo ? "ODONTOLOGO" : "PACIENTE",
        ...(esOdontologo ? { numero_colegiatura: registro.numero_colegiatura.trim() } : {}),
      });
      setRegistro(registroVacio);
      entrar(
        sesion,
        "Cuenta creada",
        esOdontologo
          ? "Estamos verificando tu colegiatura con el COP. Te avisaremos el resultado."
          : undefined,
      );
    } catch (error) {
      toast.error("No se pudo crear la cuenta", { description: mensajeDeError(error) });
    } finally {
      setEnviando(false);
    }
  };

  const googleLogin = () => {
    toast.info("El ingreso con Google estará disponible pronto.", {
      description: "Por ahora usa tu correo y contraseña.",
    });
  };

  const roles: { value: Role; label: string; icon: React.ReactNode }[] = [
    {
      value: "paciente",
      label: "Soy Paciente",
      icon: <UserRound className="size-4" />,
    },
    {
      value: "odontologo",
      label: "Soy Odontólogo",
      icon: <Stethoscope className="size-4" />,
    },
  ];

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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                key={i}
                className="flex items-start gap-3"
              >
                <ShieldCheck className="size-5 flex-shrink-0 text-primary mt-0.5" />
                {t}
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Lado derecho — form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26, delay: 0.1 }}
        >
          <Card className="border-border/70 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {mode === "login" ? "Inicia sesión" : "Crear cuenta"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Ingresa tus credenciales para continuar"
                  : "Únete a OdontoSystem en menos de un minuto"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de rol con botones */}
              <div className="rounded-xl border border-border/60 bg-muted/40 p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      aria-pressed={role === r.value}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                        role === r.value
                          ? "border-2 border-primary bg-card text-foreground shadow-sm"
                          : "border-2 border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r.icon}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "login" ? (
                <form onSubmit={submitLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={login.correo}
                      onChange={(e) => setLogin((l) => ({ ...l, correo: e.target.value }))}
                      placeholder={
                        role === "paciente" ? "paciente@example.com" : "dentista@example.com"
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={login.password}
                        onChange={(e) => setLogin((l) => ({ ...l, password: e.target.value }))}
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox id="recordarme" />
                      Recordarme
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info("La recuperación de contraseña estará disponible pronto.")}
                      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={enviando}>
                    {enviando ? "Ingresando…" : "Iniciar sesión"}
                    <ArrowRight className="size-4 ml-2" />
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
                    </div>
                  </div>

                  <Button onClick={googleLogin} variant="outline" className="w-full" type="button">
                    <Mail className="size-4 mr-2" />
                    Google
                  </Button>
                </form>
              ) : (
                <form onSubmit={submitRegistro} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">
                      {role === "paciente" ? "Nombre completo" : "Nombre profesional"}
                    </Label>
                    <Input
                      id="nombre"
                      autoComplete="name"
                      placeholder={role === "paciente" ? "Juan Pérez" : "Dra. Ana García"}
                      value={registro.nombre_completo}
                      onChange={campoRegistro("nombre_completo")}
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="tipo-doc">Documento</Label>
                      <select
                        id="tipo-doc"
                        value={registro.tipo_documento}
                        onChange={campoRegistro("tipo_documento")}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">C.E.</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="num-doc">N.º de documento</Label>
                      <Input
                        id="num-doc"
                        inputMode={registro.tipo_documento === "DNI" ? "numeric" : "text"}
                        placeholder={registro.tipo_documento === "DNI" ? "12345678" : "001234567"}
                        value={registro.numero_documento}
                        onChange={campoRegistro("numero_documento")}
                        pattern={registro.tipo_documento === "DNI" ? "[0-9]{8}" : "[A-Za-z0-9]{6,20}"}
                        title={
                          registro.tipo_documento === "DNI"
                            ? "El DNI tiene 8 dígitos"
                            : "Entre 6 y 20 letras o números"
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Celular</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      autoComplete="tel"
                      placeholder="987654321"
                      value={registro.telefono}
                      onChange={campoRegistro("telefono")}
                      maxLength={20}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-reg">Correo electrónico</Label>
                    <Input
                      id="email-reg"
                      type="email"
                      autoComplete="email"
                      placeholder={role === "paciente" ? "juan@example.com" : "ana@example.com"}
                      value={registro.correo}
                      onChange={campoRegistro("correo")}
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-reg">Contraseña</Label>
                    <Input
                      id="password-reg"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      value={registro.password}
                      onChange={campoRegistro("password")}
                      minLength={8}
                      maxLength={100}
                      required
                    />
                  </div>

                  {role === "odontologo" && (
                    <div className="space-y-2">
                      <Label htmlFor="cop-reg">N.º de colegiatura COP</Label>
                      <div className="relative">
                        <Shield className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="cop-reg"
                          inputMode="numeric"
                          placeholder="24851"
                          className="pl-9"
                          value={registro.numero_colegiatura}
                          onChange={campoRegistro("numero_colegiatura")}
                          pattern="[0-9]{1,30}"
                          title="Solo el número, sin letras (ej. 24851)"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lo verificamos con el registro oficial del COP.
                      </p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={enviando}>
                    {enviando ? "Creando cuenta…" : "Crear cuenta"}
                    <ArrowRight className="size-4 ml-2" />
                  </Button>
                </form>
              )}

              {/* Alternar entre login y registro */}
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "registro" : "login")}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {mode === "login" ? "Regístrate aquí" : "Inicia sesión"}
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <ChatbotWidget />
    </div>
  );
}
