import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BadgeCheck,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  AccesoPerfil,
  AvisoError,
  AvatarPerfil,
  Campo,
  DatoSoloLectura,
  EsqueletoPaginaPerfil,
  IconoSoloLectura,
} from "@/components/perfil/PerfilComunes";
import { mensajeDeError } from "@/components/perfil";
import { ResumenOdontologo } from "@/components/perfil/ResumenOdontologo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAppState } from "@/lib/app-state";
import {
  catalogosApi,
  miPerfilApi,
  usuariosApi,
  type EstadoVerificacionCopa,
  type MiPerfilOdontologo,
  type UsuarioYo,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/dentist/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Consulta y actualiza tu perfil profesional en OdontoSystem.",
      },
    ],
  }),
  component: PerfilOdontologo,
});

const etiquetaVerificacion: Record<EstadoVerificacionCopa, string> = {
  PENDIENTE: "Pendiente",
  OBSERVADO: "Observado",
  VERIFICADO: "Verificado",
  RECHAZADO: "Rechazado",
};

const claseVerificacion: Record<EstadoVerificacionCopa, string> = {
  PENDIENTE: "border-warning/40 bg-warning/15 text-warning-foreground",
  OBSERVADO: "border-warning/40 bg-warning/15 text-warning-foreground",
  VERIFICADO: "border-success/40 bg-success/12 text-success",
  RECHAZADO: "border-destructive/40 bg-destructive/10 text-destructive",
};

function PerfilOdontologo() {
  const { usuario: sesion } = useAppState();
  const esOdontologo = sesion?.rol === "ODONTOLOGO";
  const [usuario, setUsuario] = React.useState<UsuarioYo | null>(null);
  const [miPerfil, setMiPerfil] = React.useState<MiPerfilOdontologo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [editando, setEditando] = React.useState(false);
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    if (!esOdontologo) {
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
  }, [esOdontologo, intento]);

  if (!esOdontologo) {
    return (
      <AppShell>
        <AccesoPerfil
          titulo="Inicia sesión como odontólogo"
          descripcion={
            sesion
              ? "Tu cuenta es de paciente. El perfil profesional es solo para odontólogos."
              : "Necesitas una sesión de odontólogo para ver y editar tu perfil."
          }
        />
      </AppShell>
    );
  }

  const perfil = miPerfil?.perfil;
  const especialidades = perfil?.especialidades.map((e) => e.nombre).filter(Boolean) ?? [];
  const foto = usuario?.foto_perfil_url ?? perfil?.foto_url ?? null;

  return (
    <AppShell>
      {cargando ? (
        <EsqueletoPaginaPerfil />
      ) : error ? (
        <AvisoError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
      ) : !usuario || !miPerfil || !perfil ? (
        <AvisoError
          mensaje="No se encontró tu perfil profesional."
          onReintentar={() => setIntento((n) => n + 1)}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <header>
            <p className="flex items-center gap-2 text-sm text-primary">
              <Stethoscope className="size-4" /> Cuenta profesional
            </p>
            <h1 className="font-display text-3xl font-semibold">Mi perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Datos de contacto, consultorio y un resumen de tu actividad.
            </p>
          </header>

          <Card className="overflow-hidden rounded-3xl border-mint/50">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <AvatarPerfil
                nombre={usuario.nombre_completo}
                fotoUrl={foto}
                onCambio={(url) =>
                  setUsuario((prev) => (prev ? { ...prev, foto_perfil_url: url } : prev))
                }
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold">{usuario.nombre_completo}</h2>
                  {miPerfil.estado_verificacion === "VERIFICADO" ||
                  perfil.colegiatura_verificada ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck className="size-3.5" /> COP verificado
                    </span>
                  ) : null}
                </div>
                {especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {especialidades.map((nombre) => (
                      <Badge key={nombre} variant="secondary" className="rounded-full">
                        {nombre}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="flex items-center gap-1.5 break-all text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" /> {usuario.correo}
                </p>
              </div>
              {!editando && (
                <Button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="rounded-xl sm:shrink-0"
                >
                  <Pencil className="size-4" /> Editar perfil
                </Button>
              )}
            </CardContent>
          </Card>

          {(perfil.numero_colegiatura || miPerfil.estado_verificacion) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {perfil.numero_colegiatura ? (
                <DatoSoloLectura
                  label="Número de colegiatura COP"
                  valor={perfil.numero_colegiatura}
                  icono={<IconoSoloLectura />}
                />
              ) : null}
              {miPerfil.estado_verificacion ? (
                <DatoSoloLectura
                  label="Estado de verificación"
                  valor={
                    <Badge className={cn("mt-1", claseVerificacion[miPerfil.estado_verificacion])}>
                      {etiquetaVerificacion[miPerfil.estado_verificacion]}
                    </Badge>
                  }
                  icono={<IconoSoloLectura />}
                />
              ) : null}
            </div>
          )}
          {miPerfil.estado_verificacion === "OBSERVADO" && miPerfil.nota_observacion ? (
            <p className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
              Observación: {miPerfil.nota_observacion}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Contacto y consultorio</CardTitle>
              <CardDescription>
                Puedes actualizar nombre, teléfono, ubicación y especialidades. La colegiatura y el
                correo no se editan aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {editando ? (
                <FormularioPerfilOdontologo
                  usuario={usuario}
                  perfil={miPerfil}
                  onGuardado={(cuenta, consultorio) => {
                    setUsuario(cuenta);
                    setMiPerfil(consultorio);
                    setEditando(false);
                  }}
                  onCancelar={() => setEditando(false)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DatoSoloLectura
                    label="Teléfono"
                    valor={usuario.telefono}
                    icono={<Phone className="size-3" />}
                  />
                  <DatoSoloLectura
                    label="Correo"
                    valor={usuario.correo}
                    icono={<IconoSoloLectura />}
                  />
                  {perfil.consultorio ? (
                    <DatoSoloLectura
                      label="Clínica o consultorio"
                      valor={perfil.consultorio}
                      icono={<Building2 className="size-3" />}
                    />
                  ) : null}
                  {perfil.direccion ? (
                    <DatoSoloLectura
                      label="Dirección"
                      valor={perfil.direccion}
                      icono={<MapPin className="size-3" />}
                    />
                  ) : null}
                  {perfil.distrito ? (
                    <DatoSoloLectura label="Ubicación" valor={perfil.distrito} />
                  ) : null}
                  {!perfil.consultorio && !perfil.direccion && !perfil.distrito ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Aún no has publicado datos de consultorio. Usa «Editar perfil» para
                      completarlos.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">Resumen de actividad</h2>
            <ResumenOdontologo odontologoId={perfil.id} />
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

type ErroresPerfilOdontologo = {
  nombre?: string | undefined;
  telefono?: string | undefined;
  consultorio?: string | undefined;
  direccion?: string | undefined;
  distrito?: string | undefined;
  especialidades?: string | undefined;
};

function FormularioPerfilOdontologo({
  usuario,
  perfil,
  onGuardado,
  onCancelar,
}: {
  usuario: UsuarioYo;
  perfil: MiPerfilOdontologo;
  onGuardado: (usuario: UsuarioYo, perfil: MiPerfilOdontologo) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = React.useState(usuario.nombre_completo);
  const [telefono, setTelefono] = React.useState(usuario.telefono);
  const [consultorio, setConsultorio] = React.useState(perfil.perfil.consultorio ?? "");
  const [direccion, setDireccion] = React.useState(perfil.perfil.direccion ?? "");
  const [distrito, setDistrito] = React.useState(perfil.perfil.distrito ?? "");
  const [ids, setIds] = React.useState<number[]>(perfil.perfil.especialidades.map((e) => e.id));
  const [catalogo, setCatalogo] = React.useState<{ id: number; nombre: string }[]>([]);
  const [errorCatalogo, setErrorCatalogo] = React.useState<string | null>(null);
  const [errores, setErrores] = React.useState<ErroresPerfilOdontologo>({});
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    catalogosApi
      .especialidades()
      .then((lista) => {
        if (vigente) setCatalogo(lista);
      })
      .catch((err) => {
        if (vigente) {
          setErrorCatalogo(mensajeDeError(err, "No se pudieron cargar las especialidades."));
        }
      });
    return () => {
      vigente = false;
    };
  }, []);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const consultorioLimpio = consultorio.trim();
    const direccionLimpia = direccion.trim();
    const distritoLimpio = distrito.trim();
    const nuevos: ErroresPerfilOdontologo = {};
    if (nombreLimpio.length < 3 || nombreLimpio.length > 150) {
      nuevos.nombre = "El nombre debe tener entre 3 y 150 caracteres.";
    }
    if (!/^\+?\d{9,15}$/.test(telefonoLimpio)) {
      nuevos.telefono = "Teléfono no válido: de 9 a 15 dígitos, con o sin + al inicio.";
    }
    if (consultorioLimpio.length > 0 && consultorioLimpio.length < 2) {
      nuevos.consultorio = "El nombre del consultorio debe tener al menos 2 caracteres.";
    }
    if (direccionLimpia.length > 0 && direccionLimpia.length < 5) {
      nuevos.direccion = "La dirección debe tener al menos 5 caracteres.";
    }
    if (distritoLimpio.length > 0 && distritoLimpio.length < 2) {
      nuevos.distrito = "El distrito debe tener al menos 2 caracteres.";
    }
    if (catalogo.length > 0 && ids.length === 0) {
      nuevos.especialidades = "Selecciona al menos una especialidad.";
    }
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setGuardando(true);
    try {
      const [cuenta, consultorioActualizado] = await Promise.all([
        usuariosApi.actualizar({
          nombre_completo: nombreLimpio,
          telefono: telefonoLimpio,
        }),
        miPerfilApi.actualizar({
          ...(consultorioLimpio ? { nombre_consultorio: consultorioLimpio } : {}),
          ...(direccionLimpia ? { direccion_consultorio: direccionLimpia } : {}),
          ...(distritoLimpio ? { distrito_consultorio: distritoLimpio } : {}),
          ...(catalogo.length > 0 ? { especialidad_ids: ids } : {}),
        }),
      ]);
      toast.success("Perfil actualizado", {
        description: "Tus datos permitidos se guardaron correctamente.",
      });
      onGuardado(cuenta, consultorioActualizado);
    } catch (error) {
      toast.error("No se pudieron guardar los cambios", {
        description: mensajeDeError(error, "Inténtalo de nuevo en unos segundos."),
      });
    } finally {
      setGuardando(false);
    }
  };

  const toggleEspecialidad = (id: number, marcada: boolean) => {
    setIds((prev) => (marcada ? [...prev, id] : prev.filter((x) => x !== id)));
    if (errores.especialidades) setErrores((prev) => ({ ...prev, especialidades: undefined }));
  };

  return (
    <form onSubmit={guardar} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="perfil-nombre"
          label="Nombre completo"
          valor={nombre}
          onCambio={(valor) => {
            setNombre(valor);
            if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: undefined }));
          }}
          error={errores.nombre}
          maxLength={150}
          autoComplete="name"
          disabled={guardando}
        />
        <Campo
          id="perfil-telefono"
          label="Teléfono"
          type="tel"
          valor={telefono}
          onCambio={(valor) => {
            setTelefono(valor);
            if (errores.telefono) setErrores((prev) => ({ ...prev, telefono: undefined }));
          }}
          error={errores.telefono}
          maxLength={16}
          autoComplete="tel"
          placeholder="987654321"
          disabled={guardando}
          ayuda="De 9 a 15 dígitos; puedes anteponer el + del código de país."
        />
        <Campo
          id="perfil-consultorio"
          label="Clínica o consultorio"
          valor={consultorio}
          onCambio={(valor) => {
            setConsultorio(valor);
            if (errores.consultorio) setErrores((prev) => ({ ...prev, consultorio: undefined }));
          }}
          error={errores.consultorio}
          maxLength={150}
          disabled={guardando}
        />
        <Campo
          id="perfil-distrito"
          label="Distrito"
          valor={distrito}
          onCambio={(valor) => {
            setDistrito(valor);
            if (errores.distrito) setErrores((prev) => ({ ...prev, distrito: undefined }));
          }}
          error={errores.distrito}
          maxLength={80}
          disabled={guardando}
          placeholder="Ica"
        />
        <div className="sm:col-span-2">
          <Campo
            id="perfil-direccion"
            label="Dirección"
            valor={direccion}
            onCambio={(valor) => {
              setDireccion(valor);
              if (errores.direccion) setErrores((prev) => ({ ...prev, direccion: undefined }));
            }}
            error={errores.direccion}
            maxLength={200}
            disabled={guardando}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Especialidades</Label>
        {errorCatalogo ? (
          <p className="text-sm text-destructive">{errorCatalogo}</p>
        ) : catalogo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cargando especialidades…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogo.map((item) => {
              const marcada = ids.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-sm"
                >
                  <Checkbox
                    checked={marcada}
                    onCheckedChange={(estado) => toggleEspecialidad(item.id, estado === true)}
                    disabled={guardando}
                    aria-label={item.nombre}
                  />
                  {item.nombre}
                </label>
              );
            })}
          </div>
        )}
        {errores.especialidades ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errores.especialidades}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancelar}
          disabled={guardando}
          className="rounded-xl"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando} className="rounded-xl">
          {guardando ? (
            <>
              <Spinner /> Guardando…
            </>
          ) : (
            <>
              <Save className="size-4" /> Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
