/**
 * Componentes compartidos de la sección «Mi perfil» para ambos roles
 * (paciente y odontólogo): avatar con la foto real del backend, campos de
 * formulario validados, KPIs del resumen y estados de carga/error.
 * Un único sistema de UI; cada rol sólo aporta sus datos.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Camera, Lock, LogIn, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, usuariosApi, type EstadoCita, type UsuarioYo } from "@/lib/api";
import { fechaDe, fechaLima, iniciales } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

/** Mensaje legible de cualquier error de la API (sesión expirada incluida). */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.";
    }
    return error.message;
  }
  return porDefecto;
}

/**
 * Avatar con la foto de perfil del backend (GET /api/usuarios/yo), iniciales
 * de respaldo y botón para subir una nueva imagen (PUT /api/usuarios/yo/foto).
 */
export function AvatarPerfil({
  nombre,
  fotoUrl,
  onCambio,
}: {
  nombre: string;
  fotoUrl: string | null;
  onCambio: (url: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    // Se limpia para poder volver a elegir el mismo archivo tras un error.
    event.target.value = "";
    if (!archivo) return;
    setSubiendo(true);
    try {
      const resultado = await usuariosApi.subirFoto(archivo);
      toast.success("Foto de perfil actualizada");
      onCambio(resultado.foto_perfil_url);
    } catch (error) {
      toast.error("No se pudo subir la foto", {
        description: mensajeDeError(
          error,
          "Revisa el formato (JPG, PNG o WEBP) y el tamaño (máx. 5 MB).",
        ),
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="relative size-20 shrink-0">
      <Avatar className="size-20 border border-border/70 shadow-sm">
        <AvatarImage
          src={fotoUrl ?? undefined}
          alt={`Foto de ${nombre}`}
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-xl font-semibold text-primary-foreground">
          {iniciales(nombre)}
        </AvatarFallback>
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={subir}
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        aria-label="Cambiar foto de perfil"
        className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:bg-sky disabled:opacity-60"
      >
        {subiendo ? <Spinner aria-label="Subiendo foto" /> : <Camera className="size-4" />}
      </button>
    </div>
  );
}

/**
 * Campo de formulario con etiqueta, mensaje de error accesible (role="alert")
 * y ayudas. Acepta las props nativas de <input> (maxLength, placeholder…).
 */
export function Campo({
  id,
  label,
  valor,
  onCambio,
  error,
  ayuda,
  ...input
}: {
  id: string;
  label: string;
  valor: string;
  onCambio: (valor: string) => void;
  error?: string | undefined;
  ayuda?: string | undefined;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={valor}
        onChange={(event) => onCambio(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "h-11 rounded-xl",
          error && "border-destructive focus-visible:ring-destructive/40",
        )}
        {...input}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>
      )}
    </div>
  );
}

/** Dato de solo lectura (correo, documento, colegiatura…): nunca editable. */
export function DatoSoloLectura({
  label,
  valor,
  icono,
}: {
  label: string;
  valor: React.ReactNode;
  icono?: React.ReactNode | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icono}
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-semibold text-foreground">{valor}</p>
    </div>
  );
}

type TonoKpi = "primary" | "accent" | "success" | "destructive";

const tonoKpi: Record<TonoKpi, string> = {
  primary: "bg-primary/12 text-primary",
  accent: "bg-accent/25 text-brand-deep",
  success: "bg-success/12 text-success",
  destructive: "bg-destructive/12 text-destructive",
};

/** Tarjeta KPI del resumen (misma jerarquía visual que los dashboards). */
export function KpiPerfil({
  label,
  valor,
  icono,
  tono = "primary",
}: {
  label: string;
  valor: string | number;
  icono: React.ReactNode;
  tono?: TonoKpi | undefined;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
            <p className="font-display text-2xl font-bold text-foreground">{valor}</p>
          </div>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              tonoKpi[tono],
            )}
          >
            {icono}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Error de carga discreto con botón de reintento. */
export function AvisoError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar?: (() => void) | undefined;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center"
    >
      <AlertCircle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm font-medium text-destructive">{mensaje}</p>
      {onReintentar && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReintentar}
          className="shrink-0 rounded-lg"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}

/** Esqueleto del resumen mientras el backend responde. */
export function ResumenSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando resumen">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-6">
              {Array.from({ length: 3 }, (_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-xl" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Etiquetas y estilos de estado de cita (mismo contrato que el panel). */
export const etiquetaEstadoCita: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "Pago pendiente",
  PENDIENTE_CONFIRMACION: "Esperando confirmación",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Atendida",
  CANCELADA_CON_REEMBOLSO: "Cancelada · depósito devuelto",
  CANCELADA_SIN_REEMBOLSO: "Cancelada",
  INASISTENCIA_PENALIZADA: "Inasistencia",
  REPROGRAMADA: "Reprogramada",
};

export const claseEstadoCita: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "border-border bg-muted text-muted-foreground",
  PENDIENTE_CONFIRMACION: "border-warning/40 bg-warning/15 text-warning-foreground",
  CONFIRMADA: "border-primary/30 bg-primary/10 text-primary",
  COMPLETADA: "border-success/30 bg-success/10 text-success",
  CANCELADA_CON_REEMBOLSO: "border-border bg-muted text-muted-foreground",
  CANCELADA_SIN_REEMBOLSO: "border-border bg-muted text-muted-foreground",
  INASISTENCIA_PENALIZADA: "border-destructive/30 bg-destructive/10 text-destructive",
  REPROGRAMADA: "border-border bg-muted text-muted-foreground",
};

type ErroresContacto = { nombre?: string | undefined; telefono?: string | undefined };

/**
 * Formulario «Editar perfil» compartido por ambos roles: nombre y teléfono,
 * los únicos campos que PATCH /api/usuarios/yo acepta. El correo y el documento
 * nunca se envían (son de solo lectura en la vista).
 */
export function FormularioDatosContacto({
  usuario,
  onGuardado,
  onCancelar,
}: {
  usuario: UsuarioYo;
  onGuardado: (usuario: UsuarioYo) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = React.useState(usuario.nombre_completo);
  const [telefono, setTelefono] = React.useState(usuario.telefono);
  const [errores, setErrores] = React.useState<ErroresContacto>({});
  const [guardando, setGuardando] = React.useState(false);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const nuevos: ErroresContacto = {};
    if (nombreLimpio.length < 3 || nombreLimpio.length > 150) {
      nuevos.nombre = "El nombre debe tener entre 3 y 150 caracteres.";
    }
    if (!/^\+?\d{9,15}$/.test(telefonoLimpio)) {
      nuevos.telefono = "Teléfono no válido: de 9 a 15 dígitos, con o sin + al inicio.";
    }
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.telefono) return;

    setGuardando(true);
    try {
      const actualizado = await usuariosApi.actualizar({
        nombre_completo: nombreLimpio,
        telefono: telefonoLimpio,
      });
      toast.success("Perfil actualizado", {
        description: "Tus datos de contacto se guardaron correctamente.",
      });
      onGuardado(actualizado);
    } catch (error) {
      toast.error("No se pudieron guardar los cambios", {
        description: mensajeDeError(error, "Inténtalo de nuevo en unos segundos."),
      });
    } finally {
      setGuardando(false);
    }
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

/** Icono de solo lectura para datos que el usuario no puede editar. */
export function IconoSoloLectura() {
  return <Lock className="size-3" aria-label="Dato de solo lectura" />;
}

/** Etiqueta corta del documento de identidad (sin inventar tipos). */
export function etiquetaDocumento(tipo: string | null | undefined): string {
  if (!tipo) return "Documento";
  if (tipo === "DNI") return "DNI";
  if (tipo === "CE" || tipo === "C.E.") return "C.E.";
  return tipo;
}

/** Fecha YYYY-MM-DD a partir de un ISO o de una fecha ya recortada. */
export function fechaPerfil(valor: string): string {
  return valor.length <= 10 ? valor : fechaDe(valor);
}

/**
 * Rango de agenda para GET /api/odontologos/yo/citas (`hasta` es exclusivo).
 * Cubre ~6 meses atrás y ~3 meses adelante, sin fechas ficticias de citas.
 */
export function rangoAgendaOdontologo(): { desde: string; hasta: string } {
  return { desde: fechaLima(-180), hasta: fechaLima(91) };
}

/** Esqueleto de la página de perfil (cabecera + datos + resumen). */
export function EsqueletoPaginaPerfil() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando perfil">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Skeleton className="size-20 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <ResumenSkeleton />
    </div>
  );
}

/** Pantalla cuando no hay sesión o el rol no corresponde a esta ruta. */
export function AccesoPerfil({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <Card className="mx-auto mt-8 max-w-md text-center">
      <CardContent className="py-10">
        <LogIn className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-xl font-semibold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Ir a iniciar sesión</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
