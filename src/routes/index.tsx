// Login/Registro principal — pantalla dividida: panel teal de marca a la
// izquierda y tarjeta de acceso a la derecha. Selector de rol con botones,
// modo "Iniciar sesión" y enlace "Regístrate aquí" para alternar a registro.
// Conectado al backend: POST /api/auth/login y POST /api/auth/register (ver src/lib/api.ts).
// El rol con el que se entra lo decide el backend según la cuenta.

import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  CreditCard,
  Eye,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
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
import logoAsset from "@/assets/odontosystem-logo.png.asset.json";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const stats = [
  { value: "2,400+", label: "Especialistas" },
  { value: "98%", label: "Satisfacción" },
  { value: "50 mil", label: "Citas" },
];

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
      label: "Paciente",
      icon: <UserRound className="size-4" />,
    },
    {
      value: "odontologo",
      label: "Odontólogo",
      icon: <Stethoscope className="size-4" />,
    },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Panel izquierdo — marca */}
      <section className="hero-teal relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -right-28 -top-28 size-[26rem] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-36 -left-20 size-[30rem] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-24 right-16 size-44 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute bottom-40 right-36 size-16 rounded-full bg-white/10" />

        <header className="relative flex items-center gap-3">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white p-2.5 shadow-lg shadow-black/15 ring-1 ring-black/5">
            <img src={logoAsset.url} alt="Logo de OdontoSystem" className="size-full object-contain" />
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-tight">
              OdontoSystem
            </p>
            <p className="text-sm opacity-80">Plataforma dental verificada</p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
          className="relative"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles className="size-3.5" />
            Red COP Verificada · Ica, Perú
          </span>
          <h1 className="mt-6 max-w-lg font-display text-5xl font-bold leading-[1.05] xl:text-6xl">
            Tu salud dental, en manos expertas.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed opacity-85">
            Agenda con especialistas verificados por el Colegio Odontológico del
            Perú. Pagos seguros, citas sin complicaciones.
          </p>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/20 pt-8">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-bold">{s.value}</dd>
                <dd className="mt-1 text-sm opacity-80">{s.label}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <footer className="relative flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-medium opacity-90">
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4" /> SSL Seguro
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4" /> COP Verificado
          </span>
          <span className="inline-flex items-center gap-2">
            <CreditCard className="size-4" /> PCI Compliant
          </span>
        </footer>
      </section>

      {/* Panel derecho — acceso */}
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Marca compacta en móvil */}
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card p-2 shadow-md shadow-primary/10">
              <img src={logoAsset.url} alt="Logo de OdontoSystem" className="size-full object-contain" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight">
                OdontoSystem
              </p>
              <p className="text-xs text-muted-foreground">
                Plataforma dental verificada
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            <Card className="rounded-3xl border-border/60 shadow-xl shadow-primary/10">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
                </CardTitle>
                <CardDescription>
                  {mode === "login"
                    ? "Selecciona tu perfil para ingresar"
                    : "Únete a OdontoSystem en menos de un minuto"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selector de perfil */}
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        aria-pressed={role === r.value}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                          role === r.value
                            ? "border-2 border-primary bg-card text-primary shadow-sm"
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
                          role === "paciente"
                            ? "nombre@correo.com"
                            : "dentista@correo.com"
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
                          aria-label={
                            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                          }
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
                        onClick={() =>
                          toast.info("La recuperación de contraseña estará disponible pronto.")
                        }
                        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>

                    <Button type="submit" size="lg" className="w-full rounded-xl" disabled={enviando}>
                      {enviando ? "Ingresando…" : "Iniciar sesión"}
                      <ArrowRight className="ml-2 size-4" />
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
                          pattern={
                            registro.tipo_documento === "DNI" ? "[0-9]{8}" : "[A-Za-z0-9]{6,20}"
                          }
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
                        placeholder={role === "paciente" ? "juan@correo.com" : "ana@correo.com"}
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
                          Verificamos en tiempo real con el registro oficial COP.
                        </p>
                      </div>
                    )}

                    <Button type="submit" size="lg" className="w-full rounded-xl" disabled={enviando}>
                      {enviando ? "Creando cuenta…" : "Crear cuenta"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                )}

                {mode === "login" && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          O continúa con
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={googleLogin}
                      variant="outline"
                      className="w-full rounded-xl"
                      type="button"
                    >
                      <Mail className="mr-2 size-4" />
                      Google
                    </Button>
                  </>
                )}

                {/* Alternar entre login y registro */}
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login" ? "¿Sin cuenta? " : "¿Ya tienes cuenta? "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "registro" : "login")}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {mode === "login" ? "Regístrate gratis" : "Inicia sesión"}
                  </button>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Al continuar aceptas los{" "}
            <button
              type="button"
              onClick={() => toast.info("Términos y condiciones próximamente.")}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Términos
            </button>{" "}
            y la{" "}
            <button
              type="button"
              onClick={() => toast.info("Política de privacidad próximamente.")}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Privacidad
            </button>
          </p>
        </div>
      </section>

      <ChatbotWidget />
    </div>
  );
}
