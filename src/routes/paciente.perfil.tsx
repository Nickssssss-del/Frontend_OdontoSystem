import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Mail, Pencil, Phone, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  AccesoPerfil,
  AvisoError,
  AvatarPerfil,
  DatoSoloLectura,
  EsqueletoPaginaPerfil,
  FormularioDatosContacto,
  IconoSoloLectura,
} from "@/components/perfil/PerfilComunes";
import { etiquetaDocumento, mensajeDeError } from "@/components/perfil";
import { ResumenPaciente } from "@/components/perfil/ResumenPaciente";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";
import { usuariosApi, type UsuarioYo } from "@/lib/api";

export const Route = createFileRoute("/paciente/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil | OdontoSystem" },
      {
        name: "description",
        content: "Consulta y actualiza tus datos de paciente en OdontoSystem.",
      },
    ],
  }),
  component: PerfilPaciente,
});

function PerfilPaciente() {
  const { usuario: sesion } = useAppState();
  const esPaciente = sesion?.rol === "PACIENTE";
  const [usuario, setUsuario] = React.useState<UsuarioYo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [editando, setEditando] = React.useState(false);
  const [intento, setIntento] = React.useState(0);

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
        setError(mensajeDeError(err, "No se pudo cargar tu perfil."));
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
        <AccesoPerfil
          titulo="Inicia sesión como paciente"
          descripcion={
            sesion
              ? "Tu cuenta es de odontólogo. El perfil de paciente es para quienes reservan citas."
              : "Necesitas una sesión de paciente para ver y editar tu perfil."
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {cargando ? (
        <EsqueletoPaginaPerfil />
      ) : error ? (
        <AvisoError mensaje={error} onReintentar={() => setIntento((n) => n + 1)} />
      ) : !usuario ? (
        <AvisoError
          mensaje="No se encontró tu perfil."
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
              <UserRound className="size-4" /> Cuenta de paciente
            </p>
            <h1 className="font-display text-3xl font-semibold">Mi perfil</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tus datos personales, contacto y un resumen de tu actividad.
            </p>
          </header>

          <Card className="overflow-hidden rounded-3xl border-mint/50">
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <AvatarPerfil
                nombre={usuario.nombre_completo}
                fotoUrl={usuario.foto_perfil_url}
                onCambio={(url) =>
                  setUsuario((prev) => (prev ? { ...prev, foto_perfil_url: url } : prev))
                }
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-semibold">{usuario.nombre_completo}</h2>
                <p className="mt-1 flex items-center gap-1.5 break-all text-sm text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Datos personales y de contacto</CardTitle>
              <CardDescription>
                El correo y el documento no se pueden cambiar desde aquí.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editando ? (
                <FormularioDatosContacto
                  usuario={usuario}
                  onGuardado={(actualizado) => {
                    setUsuario(actualizado);
                    setEditando(false);
                  }}
                  onCancelar={() => setEditando(false)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DatoSoloLectura label="Nombre completo" valor={usuario.nombre_completo} />
                  <DatoSoloLectura
                    label="Correo"
                    valor={usuario.correo}
                    icono={<IconoSoloLectura />}
                  />
                  <DatoSoloLectura
                    label="Teléfono"
                    valor={usuario.telefono}
                    icono={<Phone className="size-3" />}
                  />
                  <DatoSoloLectura
                    label={etiquetaDocumento(usuario.tipo_documento)}
                    valor={usuario.numero_documento}
                    icono={<IconoSoloLectura />}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">Resumen de actividad</h2>
            <ResumenPaciente />
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}
