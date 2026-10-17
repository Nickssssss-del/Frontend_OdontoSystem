import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DatoSoloLectura,
  FormularioDatosContacto,
  IconoSoloLectura,
  mensajeDeError,
} from "@/components/perfil/PerfilComunes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/app-state";
import { leerSesion, usuariosApi, type UsuarioYo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowRight, Bell, Clock, LogOut, Mail, Phone, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/paciente/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración de cuenta | OdontoSystem" },
      {
        name: "description",
        content: "Administra tus preferencias y seguridad desde un solo lugar.",
      },
    ],
  }),
  component: ConfiguracionPaciente,
});

type PreferenciasPaciente = {
  recordatorios: boolean;
  anticipacion: "15min" | "1hora" | "24horas";
  correo: boolean;
  push: boolean;
  comunicacionAtenciones: boolean;
  historialClinico: boolean;
  // Idioma y tema visual (si están soportados)
  idioma: string; // es, en, etc.
  tema: string; // claro, oscuro
};

const PREFERENCIAS_INICIALES: PreferenciasPaciente = {
  recordatorios: true,
  anticipacion: "1hora",
  correo: true,
  push: true,
  comunicacionAtenciones: true,
  historialClinico: true,
  idioma: "es",
  tema: "claro",
};

const anticipacionLabel: Record<PreferenciasPaciente["anticipacion"], string> = {
  "15min": "15 minutos antes",
  "1hora": "1 hora antes",
  "24horas": "24 horas antes",
};

function usePreferencias(clave: string, inicial: PreferenciasPaciente) {
  const [valores, setValores] = React.useState<PreferenciasPaciente>(() => {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado ? { ...inicial, ...JSON.parse(guardado) } : inicial;
    } catch {
      return inicial;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(valores));
    } catch {
      // Sin almacenamiento: la preferencia dura mientras la pestaña esté abierta.
    }
  }, [clave, valores]);

  return [valores, setValores] as const;
}

function CambiarContrasenaButton() {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      asChild
      variant="outline"
      className="w-full sm:w-auto rounded-xl"
      onClick={() => navigate({ to: "/recuperar" })}
    >
      Cambiar contraseña <ArrowRight className="ml-2 size-4" />
    </Button>
  );
}

function ConfiguracionPaciente() {
  const { usuario: sesion, cerrarSesion } = useAppState();
  const esPaciente = sesion?.rol === "PACIENTE";
  const navigate = useNavigate();
  const sesionBackend = leerSesion();
  const clavePrefs = `odontosystem.prefs:${sesionBackend?.rol ?? "paciente"}`;
  const [preferencias, setPreferencias] = usePreferencias(clavePrefs, PREFERENCIAS_INICIALES);
  const [usuario, setUsuario] = React.useState<UsuarioYo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [editando, setEditando] = React.useState(false);
  const [intento, setIntento] = React.useState(0);
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);
  const [cerrarAbierto, setCerrarAbierto] = React.useState(false);

  React.useEffect(() => {
    if (!esPaciente) {
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    usuariosApi
      .yo()
      .then((datos) => {
        if (!vigente) return;
        setUsuario(datos);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(mensajeDeError(err, "No se pudo cargar tu cuenta."));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [esPaciente, intento]);

  if (!esPaciente) {
    return (
      <AppShell>
        <div className="mx-auto mt-10 max-w-md text-center">
          <Shield className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 font-display text-xl font-semibold">Configuración de cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sesion
              ? "Tu cuenta es de odontólogo. Accede a la configuración desde el panel del odontólogo."
              : "Inicia sesión como paciente para ver y editar tu configuración."}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const togglePref = (clave: keyof PreferenciasPaciente, valor: boolean | string) => {
    setPreferencias((prev) => {
      const siguiente = { ...prev, [clave]: valor };
      toast.success("Preferencia guardada", {
        description:
          typeof valor === "boolean" ? (valor ? "Activada" : "Desactivada") : String(valor),
      });
      return siguiente;
    });
  };

  const salir = async () => {
    setCerrandoSesion(true);
    try {
      cerrarSesion();
      navigate({ to: "/" });
      toast.success("Sesión cerrada", { description: "Hasta pronto." });
    } finally {
      setCerrandoSesion(false);
      setCerrarAbierto(false);
    }
  };

  return (
    <AppShell>
      {cargando ? (
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Cargando configuración…
        </div>
      ) : error ? (
        <div className="mx-auto mt-10 max-w-md text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => setIntento((n) => n + 1)}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <header>
            <div className="flex items-center gap-2.5">
              <img src="/odontosystem-logo.png" alt="OdontoSystem" className="size-8" />
              <div className="min-w-0 flex-col leading-none">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  OdontoSystem
                </span>
                <h1 className="font-display text-2xl font-semibold">Configuración de cuenta</h1>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra tus preferencias y seguridad desde un solo lugar.
            </p>
          </header>

          {/* Cuenta y acceso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <UserRound className="size-5 text-primary" /> Cuenta y acceso
              </CardTitle>
              <CardDescription>
                Tus datos de la cuenta. El correo y el documento son de solo lectura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editando ? (
                <FormularioDatosContacto
                  usuario={usuario!}
                  onGuardado={() => {
                    setEditando(false);
                    toast.success("Cuenta actualizada", {
                      description: "Tus datos de contacto se guardaron correctamente.",
                    });
                  }}
                  onCancelar={() => setEditando(false)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DatoSoloLectura label="Nombre completo" valor={usuario!.nombre_completo} />
                  <DatoSoloLectura
                    label="Correo"
                    valor={usuario!.correo}
                    icono={<IconoSoloLectura />}
                  />
                  <DatoSoloLectura
                    label="Teléfono"
                    valor={usuario!.telefono}
                    icono={<Phone className="size-3" />}
                  />
                  <DatoSoloLectura
                    label="Rol"
                    valor="Paciente"
                    icono={<UserRound className="size-3" />}
                  />
                </div>
              )}
              <div className="mt-5 flex items-center gap-3">
                {!editando ? (
                  <Button type="button" onClick={() => setEditando(true)} className="rounded-xl">
                    Editar datos de contacto
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditando(false)}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/paciente/perfil">Ir a Mi perfil</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Shield className="size-5 text-primary" /> Seguridad
              </CardTitle>
              <CardDescription>
                Cambia tu contraseña o recupera el acceso a tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Cambiar contraseña</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se te enviará un código de verificación a tu correo para crear una nueva
                    contraseña.
                  </p>
                </div>
                <CambiarContrasenaButton />
              </div>
              <p className="text-xs text-muted-foreground">
                ¿No recuerdas tu contraseña? Usa{" "}
                <span className="font-medium text-primary">¿Olvidaste tu contraseña?</span>
                desde el inicio de sesión o el enlace de recuperación.
              </p>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Bell className="size-5 text-primary" /> Notificaciones
              </CardTitle>
              <CardDescription>Elige cómo quieres que OdontoSystem te avise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">Notificaciones por correo electrónico</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Novedades de tu cuenta y de tus citas por correo.
                  </p>
                </div>
                <Switch
                  checked={preferencias.correo}
                  onCheckedChange={(v) => togglePref("correo", v === true)}
                  aria-label="Notificaciones por correo electrónico"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">Notificaciones en la app</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Alertas mientras usas OdontoSystem.
                  </p>
                </div>
                <Switch
                  checked={preferencias.push}
                  onCheckedChange={(v) => togglePref("push", v === true)}
                  aria-label="Notificaciones en la app"
                />
              </div>
              <div className="space-y-2">
                <Label>Recordatorios de citas</Label>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">Activar recordatorios de citas</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recibe un aviso antes de cada cita confirmada.
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.recordatorios}
                    onCheckedChange={(v) => togglePref("recordatorios", v === true)}
                    aria-label="Recordatorios de citas"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  El aviso se envía con la anticipación seleccionada cada vez que haya una cita
                  próxima.
                </p>
              </div>
              {!preferencias.recordatorios ? null : (
                <>
                  <div className="space-y-2">
                    <Label>Anticipación del aviso</Label>
                    <Select
                      value={preferencias.anticipacion}
                      onValueChange={(valor) => {
                        if (valor) togglePref("anticipacion", valor);
                      }}
                      disabled={!preferencias.recordatorios}
                    >
                      <SelectLabel className="sr-only">Anticipación del aviso</SelectLabel>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Elige una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(anticipacionLabel).map(([valor, etiqueta]) => (
                          <SelectItem key={valor} value={valor}>
                            {etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El aviso se envía con la anticipación seleccionada cada vez que haya una cita
                      próxima.
                    </p>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Comunicación y notificaciones de tus atenciones</Label>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">Notificar nuevas atenciones</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Avisos cuando se registre una atención odontológica.
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.comunicacionAtenciones}
                    onCheckedChange={(v) => togglePref("comunicacionAtenciones", v === true)}
                    aria-label="Notificar nuevas atenciones"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">Historial clínico disponible</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Notifica cuando haya una nueva historia clínica para consultar.
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.historialClinico}
                    onCheckedChange={(v) => togglePref("historialClinico", v === true)}
                    aria-label="Historial clínico disponible"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Shield className="size-5 text-primary" /> Preferencias
              </CardTitle>
              <CardDescription>Idioma, tema visual y otras opciones disponibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Idioma */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">Idioma</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selecciona el idioma de la interfaz.
                  </p>
                </div>
                {/* Simulamos un select deshabilitado si no hay soporte real */}
                <select
                  value={preferencias.idioma}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor) togglePref("idioma", valor);
                  }}
                  disabled={true} // Asumimos que no hay endpoint para guardar idioma
                  className="ml-4 w-[200px] rounded-border border border-border/70 bg-background p-2"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
                <p className="text-xs text-muted-foreground ml-2">
                  (Preferencia no guardable en esta versión)
                </p>
              </div>

              {/* Tema visual */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 mt-4">
                <div>
                  <p className="text-sm font-semibold">Tema visual</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Elige entre tema claro y oscuro.
                  </p>
                </div>
                <Switch
                  checked={preferencias.tema === "oscuro"}
                  onCheckedChange={(v) => togglePref("tema", v ? "oscuro" : "claro")}
                  disabled={true} // Asumimos que no hay endpoint para guardar tema
                  aria-label="Tema visual"
                />
                <p className="text-xs text-muted-foreground ml-2">
                  (Preferencia no guardable en esta versión)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cerrar sesión */}
          <Card className="border-destructive/50">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold">Cerrar sesión</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se cerrará tu cuenta en este dispositivo.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setCerrarAbierto(true)}
                disabled={cerrandoSesion}
                className="rounded-xl"
              >
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>

          <AlertDialog open={cerrarAbierto} onOpenChange={setCerrarAbierto}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tendrás que iniciar sesión de nuevo con tu correo y contraseña.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={salir} className="text-destructive">
                  {cerrandoSesion ? "Cerrando…" : "Cerrar sesión"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppShell>
  );
}
