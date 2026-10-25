// Configuración del odontólogo — cuenta, seguridad, preferencias de notificaciones,
// disponibilidad y agenda, y datos profesionales del consultorio.
// Respeta los permisos de verificación COP: la colegiatura y el estado de
// verificación son de solo lectura y se gestionan con VerificacionCOP.
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DatoSoloLectura,
  FormularioDatosContacto,
  IconoSoloLectura,
} from "@/components/perfil/PerfilComunes";
import { mensajeDeError } from "@/components/perfil";
import { VerificacionCOP } from "@/components/VerificacionCOP";
import { ConsentimientosCard } from "@/components/paciente/ConsentimientosCard";
import { MapaConsultorio } from "@/components/MapaConsultorio";
import { SelectorUbicacionMapa } from "@/components/SelectorUbicacionMapa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  catalogosApi,
  leerSesion,
  miPerfilApi,
  usuariosApi,
  type ActualizarPerfilOdontologoRequest,
  type MiPerfilOdontologo,
  type UsuarioYo,
} from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/odontologo/configuracion")({
  head: () => ({ meta: [{ title: "Configuración del odontólogo | OdontoSystem" }] }),
  component: ConfiguracionOdontologo,
});

type PreferenciasOdontologo = {
  recordatoriosCitas: boolean;
  confirmacionesCitas: boolean;
  cancelacionesCitas: boolean;
  correo: boolean;
};

const PREFERENCIAS_INICIALES: PreferenciasOdontologo = {
  recordatoriosCitas: true,
  confirmacionesCitas: true,
  cancelacionesCitas: true,
  correo: true,
};

function usePreferencias(clave: string, inicial: PreferenciasOdontologo) {
  const [valores, setValores] = React.useState<PreferenciasOdontologo>(() => {
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

const etiquetaVerificacion: Record<string, string> = {
  PENDIENTE: "Pendiente",
  OBSERVADO: "Observado",
  VERIFICADO: "Verificado",
  RECHAZADO: "Rechazado",
};

function estadoClase(estado: string) {
  return (
    {
      PENDIENTE: "border-warning/40 bg-warning/15 text-warning-foreground",
      OBSERVADO: "border-warning/40 bg-warning/15 text-warning-foreground",
      VERIFICADO: "border-success/40 bg-success/15 text-success-foreground",
      RECHAZADO: "border-destructive/40 bg-destructive/10 text-destructive",
    }[estado] ?? "border-border text-muted-foreground"
  );
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  prominent = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  prominent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${prominent ? "border-warning/40 bg-warning/10" : "border-border"}`}
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function ConfiguracionOdontologo() {
  const { blockedToday, setBlockedToday, cerrarSesion, usuario: sesion } = useAppState();
  const navigate = useNavigate();
  const sesionBackend = leerSesion();
  const clavePrefs = `odontosystem.prefs:${sesionBackend?.rol ?? "odontologo"}`;
  const [preferencias, setPreferencias] = usePreferencias(clavePrefs, PREFERENCIAS_INICIALES);
  const [usuario, setUsuario] = React.useState<UsuarioYo | null>(null);
  const [miPerfil, setMiPerfil] = React.useState<MiPerfilOdontologo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [editandoCuenta, setEditandoCuenta] = React.useState(false);
  const [editandoProfesional, setEditandoProfesional] = React.useState(false);
  const [intento, setIntento] = React.useState(0);
  const [cargandoCatalogo, setCargandoCatalogo] = React.useState(false);
  const [catalogo, setCatalogo] = React.useState<{ id: number; nombre: string }[]>([]);
  const [idsEspecialidades, setIdsEspecialidades] = React.useState<number[]>([]);
  const [dialogBlockOpen, setDialogBlockOpen] = React.useState(false);
  const [cerrandoSesion, setCerrandoSesion] = React.useState(false);
  const [cerrarAbierto, setCerrarAbierto] = React.useState(false);

  React.useEffect(() => {
    const rolOdontologo = sesion?.rol === "ODONTOLOGO";
    if (!rolOdontologo) {
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    Promise.all([usuariosApi.yo(), miPerfilApi.obtener()])
      .then(([cuenta, perfil]) => {
        if (!vigente) return;
        setUsuario(cuenta);
        setMiPerfil(perfil);
        setIdsEspecialidades(
          perfil.perfil.especialidades.map((e: { id: number; nombre: string }) => e.id),
        );
      })
      .catch((err) => {
        if (!vigente) return;
        setError(mensajeDeError(err, "No se pudo cargar tu perfil profesional."));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [sesion?.rol, intento]);

  React.useEffect(() => {
    if (!miPerfil) return;
    setCargandoCatalogo(true);
    catalogosApi
      .especialidades()
      .then((lista) => setCatalogo(lista))
      .finally(() => setCargandoCatalogo(false));
  }, [miPerfil]);

  const perfil = miPerfil?.perfil;
  const estadoVerificacion = miPerfil?.estado_verificacion;

  const [consultorioInput, setConsultorioInput] = React.useState("");
  const [direccionInput, setDireccionInput] = React.useState("");
  const [distritoInput, setDistritoInput] = React.useState("");
  const [latitudInput, setLatitudInput] = React.useState<number | null>(null);
  const [longitudInput, setLongitudInput] = React.useState<number | null>(null);
  const [rucInput, setRucInput] = React.useState("");
  const [cciInput, setCciInput] = React.useState("");

  React.useEffect(() => {
    if (!miPerfil) return;
    setRucInput(miPerfil.ruc ?? "");
    setCciInput(miPerfil.cci ?? "");
  }, [miPerfil]);

  React.useEffect(() => {
    if (!perfil) return;
    setConsultorioInput(perfil.consultorio ?? "");
    setDireccionInput(perfil.direccion ?? "");
    setDistritoInput(perfil.distrito ?? "");
    setLatitudInput(perfil.latitud ?? null);
    setLongitudInput(perfil.longitud ?? null);
  }, [perfil]);

  if (sesion?.rol !== "ODONTOLOGO") {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <Shield className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-xl font-semibold">Configuración del odontólogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sesion
            ? "Tu cuenta es de paciente. Accede a la configuración desde tu perfil de paciente."
            : "Inicia sesión como odontólogo para ver y editar tu configuración."}
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Ir a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  const togglePref = (clave: keyof PreferenciasOdontologo, valor: boolean) => {
    setPreferencias((prev) => {
      const siguiente = { ...prev, [clave]: valor };
      toast.success("Preferencia guardada", { description: valor ? "Activada" : "Desactivada" });
      return siguiente;
    });
  };

  const toggleEspecialidad = (id: number, marcada: boolean) => {
    setIdsEspecialidades((prev) => (marcada ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const guardarProfesional = async (event: React.FormEvent) => {
    event.preventDefault();
    if (catalogo.length > 0 && idsEspecialidades.length === 0) {
      toast.error("Selecciona al menos una especialidad.");
      return;
    }
    const datos: ActualizarPerfilOdontologoRequest = {};
    const consultorioLimpio = consultorioInput.trim();
    const direccionLimpia = direccionInput.trim();
    const distritoLimpio = distritoInput.trim();
    if (consultorioLimpio.length > 0 && consultorioLimpio.length < 2) {
      toast.error("El nombre del consultorio debe tener al menos 2 caracteres.");
      return;
    }
    if (direccionLimpia.length > 0 && direccionLimpia.length < 5) {
      toast.error("La dirección debe tener al menos 5 caracteres.");
      return;
    }
    if (distritoLimpio.length > 0 && distritoLimpio.length < 2) {
      toast.error("El distrito debe tener al menos 2 caracteres.");
      return;
    }
    if (rucInput !== "" && !/^\d{11}$/.test(rucInput)) {
      toast.error("El RUC tiene 11 dígitos.");
      return;
    }
    if (cciInput !== "" && !/^\d{20}$/.test(cciInput)) {
      toast.error("El CCI tiene 20 dígitos.");
      return;
    }
    if (rucInput !== (miPerfil?.ruc ?? "")) datos.ruc = rucInput;
    if (cciInput !== (miPerfil?.cci ?? "")) datos.cci = cciInput;
    if (consultorioLimpio) datos.nombre_consultorio = consultorioLimpio;
    if (direccionLimpia) datos.direccion_consultorio = direccionLimpia;
    if (distritoLimpio) datos.distrito_consultorio = distritoLimpio;
    if (typeof latitudInput === "number" && typeof longitudInput === "number") {
      datos.latitud = latitudInput;
      datos.longitud = longitudInput;
    }
    datos.especialidad_ids = idsEspecialidades;

    setEditandoProfesional(false);
    try {
      setMiPerfil(await miPerfilApi.actualizar(datos));
      toast.success("Datos profesionales actualizados", {
        description: "Tu consultorio y especialidades se guardaron correctamente.",
      });
    } catch (err) {
      setEditandoProfesional(true);
      toast.error("No se pudieron guardar los cambios", {
        description: mensajeDeError(err, "Inténtalo de nuevo en unos segundos."),
      });
    }
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

  const requestBlock = (checked: boolean) =>
    checked ? setDialogBlockOpen(true) : setBlockedToday(false);

  /** Guarda en el backend un ajuste del consultorio (frecuencia, confirmación manual, RUC/CCI). */
  const guardarAjuste = async (cambios: ActualizarPerfilOdontologoRequest, exito: string) => {
    try {
      setMiPerfil(await miPerfilApi.actualizar(cambios));
      toast.success(exito);
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: mensajeDeError(err, "Inténtalo de nuevo."),
      });
    }
  };

  const frecuenciaDisponibilidad = miPerfil?.frecuencia_disponibilidad ?? "SEMANAL";
  const confirmacionManual = perfil?.requiere_confirmacion_manual ?? false;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2.5">
          <img src="/odontosystem-logo.png" alt="OdontoSystem" className="size-8" />
          <div className="min-w-0 flex-col leading-none">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              OdontoSystem
            </span>
            <h1 className="font-display text-2xl font-semibold">Configuración</h1>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentación COP, disponibilidad, agenda y preferencias de tu consultorio.
        </p>
      </header>

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
        <>
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
              {editandoCuenta ? (
                <FormularioDatosContacto
                  usuario={usuario!}
                  onGuardado={() => {
                    setEditandoCuenta(false);
                  }}
                  onCancelar={() => setEditandoCuenta(false)}
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
                    valor="Odontólogo"
                    icono={<UserRound className="size-3" />}
                  />
                </div>
              )}
              <div className="mt-5 flex items-center gap-3">
                {!editandoCuenta ? (
                  <Button
                    type="button"
                    onClick={() => setEditandoCuenta(true)}
                    className="rounded-xl"
                  >
                    Editar datos de contacto
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditandoCuenta(false)}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                )}
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/dentist/perfil">Ir a Mi perfil</Link>
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
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/recuperar">
                    Cambiar contraseña <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ¿No recuerdas tu contraseña? Usa{" "}
                <span className="font-medium text-primary">¿Olvidaste tu contraseña?</span>
                desde el inicio de sesión o el enlace de recuperación.
              </p>
            </CardContent>
          </Card>

          {/* Preferencias de notificaciones (odontólogo) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Bell className="size-5 text-primary" /> Preferencias de notificaciones de citas
              </CardTitle>
              <CardDescription>
                Elige qué avisos recibes sobre la agenda de tu consultorio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow
                label="Recordatorios de citas próximas"
                description="Te avisa cuando se acerca una cita confirmada."
                checked={preferencias.recordatoriosCitas}
                onCheckedChange={(v) => togglePref("recordatoriosCitas", v)}
              />
              <SettingRow
                label="Confirmaciones de cita"
                description="Te avisa cuando un paciente confirma o paga una cita."
                checked={preferencias.confirmacionesCitas}
                onCheckedChange={(v) => togglePref("confirmacionesCitas", v)}
              />
              <SettingRow
                label="Cancelaciones y reprogramaciones"
                description="Te avisa cuando un paciente cancela o reprograma una cita."
                checked={preferencias.cancelacionesCitas}
                onCheckedChange={(v) => togglePref("cancelacionesCitas", v)}
              />
              <SettingRow
                label="Notificaciones por correo electrónico"
                description="Copia de los avisos de agenda en tu correo."
                checked={preferencias.correo}
                onCheckedChange={(v) => togglePref("correo", v)}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Estas preferencias se guardan en tu dispositivo.
              </p>
            </CardContent>
          </Card>

          {/* Disponibilidad y agenda (existen en el sistema) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <CalendarClock className="size-5 text-primary" /> Disponibilidad
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define con qué frecuencia actualizas tus bloques.
                </p>
              </CardHeader>
              <CardContent>
                <ToggleGroup
                  type="single"
                  value={frecuenciaDisponibilidad}
                  onValueChange={(value) => {
                    if (value !== "DIARIA" && value !== "SEMANAL") return;
                    if (value === frecuenciaDisponibilidad) return;
                    void guardarAjuste(
                      { frecuencia_disponibilidad: value },
                      "Frecuencia de disponibilidad guardada",
                    );
                  }}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <ToggleGroupItem value="DIARIA" className="h-auto justify-start p-4 text-left">
                    Diariamente
                  </ToggleGroupItem>
                  <ToggleGroupItem value="SEMANAL" className="h-auto justify-start p-4 text-left">
                    Semanalmente
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="mt-3 text-xs text-muted-foreground">
                  {frecuenciaDisponibilidad === "DIARIA"
                    ? "Actualizo mi disponibilidad diariamente"
                    : "Actualizo mi disponibilidad semanalmente"}
                  . Se guarda en tu cuenta.
                </p>
              </CardContent>
            </Card>
            <Card className={blockedToday ? "border-destructive/50" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <AlertTriangle className="size-5 text-warning" /> Bloqueo Express
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pausa la agenda de hoy cuando ocurre una emergencia.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingRow
                  label="Activar bloqueo express de mi agenda"
                  description="Requiere confirmación porque afecta los turnos de hoy."
                  checked={blockedToday}
                  onCheckedChange={requestBlock}
                  prominent
                />
                <SettingRow
                  label="Confirmar manualmente cada reserva"
                  description="Las citas pagadas quedan pendientes de confirmación hasta que las revises en tu agenda."
                  checked={confirmacionManual}
                  onCheckedChange={(v) =>
                    void guardarAjuste(
                      { requiere_confirmacion_manual: v },
                      v ? "Confirmación manual activada" : "Confirmación manual desactivada",
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Datos profesionales (respetando permisos COP) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <ShieldCheck className="size-5 text-primary" /> Datos profesionales
              </CardTitle>
              <CardDescription>
                Consultorio, dirección, distrito y especialidades. La colegiatura y el estado de
                verificación COP no se editan desde aquí.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editandoProfesional && cargandoCatalogo ? (
                <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
                  Cargando especialidades…
                </div>
              ) : editandoProfesional ? (
                <form onSubmit={guardarProfesional} noValidate className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prof-consultorio">Clínica o consultorio</Label>
                      <Input
                        id="prof-consultorio"
                        value={consultorioInput}
                        onChange={(e) => setConsultorioInput(e.target.value)}
                        maxLength={150}
                        placeholder="Odontosystem Ica"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-distrito">Distrito</Label>
                      <Input
                        id="prof-distrito"
                        value={distritoInput}
                        onChange={(e) => setDistritoInput(e.target.value)}
                        maxLength={80}
                        placeholder="Ica"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-direccion">Dirección</Label>
                    <Input
                      id="prof-direccion"
                      value={direccionInput}
                      onChange={(e) => setDireccionInput(e.target.value)}
                      maxLength={200}
                      placeholder="Av. Lima 123"
                    />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>Ubicación geográfica en el mapa (GPS)</Label>
                    <SelectorUbicacionMapa
                      latitud={latitudInput}
                      longitud={longitudInput}
                      onChange={(coords) => {
                        setLatitudInput(coords ? coords.lat : null);
                        setLongitudInput(coords ? coords.lng : null);
                      }}
                      altura={250}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prof-ruc">RUC</Label>
                      <Input
                        id="prof-ruc"
                        inputMode="numeric"
                        value={rucInput}
                        onChange={(e) => setRucInput(e.target.value.replace(/\D/g, ""))}
                        maxLength={11}
                        placeholder="11 dígitos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prof-cci">CCI (para tus liquidaciones)</Label>
                      <Input
                        id="prof-cci"
                        inputMode="numeric"
                        value={cciInput}
                        onChange={(e) => setCciInput(e.target.value.replace(/\D/g, ""))}
                        maxLength={20}
                        placeholder="20 dígitos"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Especialidades</Label>
                    {catalogo.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Cargando especialidades…</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {catalogo.map((item) => {
                          const marcada = idsEspecialidades.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={marcada}
                                onCheckedChange={(estado) =>
                                  toggleEspecialidad(item.id, estado === true)
                                }
                                aria-label={item.nombre}
                              />
                              {item.nombre}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setConsultorioInput(perfil?.consultorio ?? "");
                        setDireccionInput(perfil?.direccion ?? "");
                        setDistritoInput(perfil?.distrito ?? "");
                        setLatitudInput(perfil?.latitud ?? null);
                        setLongitudInput(perfil?.longitud ?? null);
                        setRucInput(miPerfil?.ruc ?? "");
                        setCciInput(miPerfil?.cci ?? "");
                        setIdsEspecialidades(perfil?.especialidades.map((e) => e.id) ?? []);
                        setEditandoProfesional(false);
                      }}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="rounded-xl">
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {perfil?.consultorio ? (
                      <DatoSoloLectura
                        label="Clínica o consultorio"
                        valor={perfil.consultorio}
                        icono={<Building2 className="size-3" />}
                      />
                    ) : null}
                    {perfil?.direccion ? (
                      <DatoSoloLectura
                        label="Dirección"
                        valor={perfil.direccion}
                        icono={<MapPin className="size-3" />}
                      />
                    ) : null}
                    {perfil?.distrito ? (
                      <DatoSoloLectura label="Distrito" valor={perfil.distrito} />
                    ) : null}
                    {miPerfil?.ruc ? <DatoSoloLectura label="RUC" valor={miPerfil.ruc} /> : null}
                    {miPerfil?.cci ? <DatoSoloLectura label="CCI" valor={miPerfil.cci} /> : null}
                    {!perfil?.consultorio && !perfil?.direccion && !perfil?.distrito ? (
                      <p className="text-sm text-muted-foreground sm:col-span-2">
                        Aún no has publicado datos de consultorio. Pulsa «Editar datos
                        profesionales» para completarlos.
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-border/70 pt-5">
                    <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      Ubicación del consultorio en el mapa
                    </h3>
                    <MapaConsultorio
                      latitud={perfil?.latitud}
                      longitud={perfil?.longitud}
                      nombreConsultorio={perfil?.consultorio}
                      direccion={perfil?.direccion}
                      distrito={perfil?.distrito}
                      altura={230}
                    />
                  </div>
                </div>
              )}
              {!editandoProfesional && (
                <div className="mt-5 flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setEditandoProfesional(true)}
                    className="rounded-xl"
                  >
                    Editar datos profesionales
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/dentist/perfil">Ver perfil completo</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentación y verificación COP */}
          <VerificacionCOP
            onEstado={(e) =>
              setMiPerfil((p) =>
                p && (p.estado_verificacion !== e.estado || p.nota_observacion !== e.nota)
                  ? { ...p, estado_verificacion: e.estado, nota_observacion: e.nota }
                  : p,
              )
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {estadoVerificacion && (
              <DatoSoloLectura
                label="Estado de verificación COP"
                valor={
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      estadoClase(estadoVerificacion),
                    )}
                  >
                    {estadoVerificacion === "VERIFICADO" && <BadgeCheck className="size-3.5" />}
                    {etiquetaVerificacion[estadoVerificacion]}
                  </span>
                }
                icono={<IconoSoloLectura />}
              />
            )}
            {perfil?.numero_colegiatura && (
              <DatoSoloLectura
                label="Número de colegiatura COP"
                valor={perfil.numero_colegiatura}
                icono={<IconoSoloLectura />}
              />
            )}
          </div>

          <ConsentimientosCard />

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

          {/* Confirmación de bloqueo express */}
          <AlertDialog open={dialogBlockOpen} onOpenChange={setDialogBlockOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Activar bloqueo express?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se cancelarán con reembolso del 100 % las citas que quedan hoy y se dejará de
                  ofrecer cupos hasta que termine el día. Puedes quitar el bloqueo cuando quieras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar con la agenda</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setBlockedToday(true);
                  }}
                >
                  Activar bloqueo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
