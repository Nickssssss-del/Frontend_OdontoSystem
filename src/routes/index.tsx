// INSTRUCCIONES: Reemplaza el archivo actual /src/routes/index.tsx con este.
// Incluye un botón de "Cambiar rol" en el login para alternar entre paciente y odontólogo.

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
  ArrowLeftRight,
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
import { useAppState } from "@/lib/app-state";
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
  const { setUserRole } = useAppState();
  const [role, setRole] = React.useState<Role>("paciente");
  const [mode, setMode] = React.useState<Mode>("login");
  const [bio, setBio] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Actualizar el rol en el estado global
    setUserRole(role === "paciente" ? "patient" : "dentist");
    
    toast.success("Sesión iniciada", {
      description:
        role === "paciente"
          ? "Bienvenida a tu panel de paciente."
          : "Bienvenida a tu panel de odontólogo.",
    });
    
    // Navegar según el rol
    navigate({ 
      to: role === "paciente" ? "/paciente/catalogo" : "/dentist/dashboard" 
    });
  };

  const googleLogin = () => {
    setUserRole(role === "paciente" ? "patient" : "dentist");
    toast.success("Continuando con Google");
    navigate({ 
      to: role === "paciente" ? "/paciente/catalogo" : "/dentist/dashboard" 
    });
  };

  const toggleRole = () => {
    setRole(role === "paciente" ? "odontologo" : "paciente");
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
              <CardTitle>Ingresar a OdontoSystem</CardTitle>
              <CardDescription>Accede como paciente u odontólogo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selector con Toggle */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Cambiar rol:</p>
                    <p className="text-xs text-muted-foreground">
                      Ingresa como {role === "paciente" ? "odontólogo" : "paciente"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={toggleRole}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowLeftRight className="size-4" />
                    Cambiar
                  </Button>
                </div>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                {role === "paciente" ? (
                  <>
                    <UserRound className="size-5 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-primary">Ingresando como Paciente</p>
                      <p className="text-xs text-primary/70">
                        Acceso al catálogo, mis citas e historial
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Stethoscope className="size-5 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-primary">Ingresando como Odontólogo</p>
                      <p className="text-xs text-primary/70">
                        Dashboard, agenda, pacientes y horarios
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Tab de Login/Registro */}
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="registro">Registrarse</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 mt-4">
                  <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={
                          role === "paciente"
                            ? "paciente@example.com"
                            : "dentista@example.com"
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" type="password" placeholder="••••••" required />
                    </div>

                    {role === "odontologo" && (
                      <div className="space-y-2">
                        <Label htmlFor="cop">Número de Colegiatura COP</Label>
                        <Input
                          id="cop"
                          placeholder="COP-XXXXX"
                          required
                        />
                      </div>
                    )}

                    <Button type="submit" className="w-full">
                      Continuar
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
                    </div>
                  </div>

                  <Button onClick={googleLogin} variant="outline" className="w-full">
                    <Mail className="size-4 mr-2" />
                    Google
                  </Button>
                </TabsContent>

                <TabsContent value="registro" className="space-y-4 mt-4">
                  <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">
                        {role === "paciente" ? "Nombre completo" : "Nombre profesional"}
                      </Label>
                      <Input
                        id="nombre"
                        placeholder={
                          role === "paciente" ? "Juan Pérez" : "Dra. Ana García"
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-reg">Correo electrónico</Label>
                      <Input
                        id="email-reg"
                        type="email"
                        placeholder={
                          role === "paciente"
                            ? "juan@example.com"
                            : "ana@example.com"
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password-reg">Contraseña</Label>
                      <Input id="password-reg" type="password" placeholder="••••••" required />
                    </div>

                    {role === "odontologo" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="cop-reg">Número de Colegiatura COP</Label>
                          <Input
                            id="cop-reg"
                            placeholder="COP-XXXXX"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="especialidad">Especialidad</Label>
                          <Input
                            id="especialidad"
                            placeholder="Ej: Ortodoncia"
                            required
                          />
                        </div>
                      </>
                    )}

                    {role === "paciente" && (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono (opcional)</Label>
                        <Input id="phone" placeholder="+51 987 654 321" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={bio}
                        onChange={(e) => setBio(e.target.checked)}
                        className="rounded"
                        required
                      />
                      <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                        Aceptar términos y condiciones
                      </label>
                    </div>

                    <Button type="submit" disabled={!bio} className="w-full">
                      Crear cuenta
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="text-center text-xs text-muted-foreground">
                {mode === "login"
                  ? "¿No tienes cuenta? Usa la pestaña Registrarse"
                  : "¿Ya tienes cuenta? Usa la pestaña Iniciar sesión"}
              </p>
            </CardContent>
          </Card>

          {/* Quick Testing Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground space-y-2"
          >
            <p className="font-semibold">🧪 Testing rápido:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Usa el botón "Cambiar" para alterar entre Paciente y Odontólogo</li>
              <li>Las vistas se actualizarán según el rol seleccionado</li>
              <li>Paciente → Catálogo + Mi Panel + TopBar</li>
              <li>Odontólogo → Dashboard + Agenda + Sidebar</li>
            </ul>
          </motion.div>
        </motion.section>
      </div>

      <ChatbotWidget />
    </div>
  );
}
