import * as React from "react";
import {
  BadgeCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  documentosApi,
  verificacionApi,
  type DocumentoOdontologo,
  type EstadoVerificacion,
  type TipoDocumento,
} from "@/lib/api";
import { fechaHora, mensajeDe } from "@/lib/formato";
import { cn } from "@/lib/utils";

type Estado = EstadoVerificacion["estado"];

const statusStyles: Record<Estado, string> = {
  PENDIENTE: "border-border bg-muted text-muted-foreground",
  OBSERVADO: "border-warning/40 bg-warning/15 text-warning-foreground",
  RECHAZADO: "border-destructive/40 bg-destructive/10 text-destructive",
  VERIFICADO: "border-success/40 bg-success/15 text-success-foreground",
};

const detalleEstado: Record<Estado, string> = {
  PENDIENTE:
    "Estamos consultando al Colegio Odontológico. Si no responde, se reintenta automáticamente.",
  VERIFICADO: "Tu colegiatura fue validada por el COP.",
  OBSERVADO: "Hay datos u observaciones que debes revisar; sube de nuevo tus documentos.",
  RECHAZADO: "No pudimos validar tu colegiatura.",
};

const TIPOS: { clave: TipoDocumento; etiqueta: string; descripcion: string }[] = [
  { clave: "DNI", etiqueta: "DNI", descripcion: "Documento de identidad vigente" },
  {
    clave: "TITULO_PROFESIONAL",
    etiqueta: "Título",
    descripcion: "Título profesional de odontología",
  },
  { clave: "COLEGIATURA", etiqueta: "Colegiatura", descripcion: "Constancia de colegiatura COP" },
  { clave: "CV", etiqueta: "CV", descripcion: "Currículum profesional actualizado" },
];

/**
 * Verificación COP y documentos del odontólogo, conectados al backend:
 * GET /api/odontologos/yo/verificacion (+ /reintentar) y /api/odontologos/yo/documentos.
 * La verificación la hace el backend contra el COP: aquí solo se muestra el estado real.
 */
export function VerificacionCOP({ onEstado }: { onEstado?: (e: EstadoVerificacion) => void }) {
  const [estado, setEstado] = React.useState<EstadoVerificacion | null>(null);
  const [documentos, setDocumentos] = React.useState<DocumentoOdontologo[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);
  const [subiendo, setSubiendo] = React.useState<TipoDocumento | null>(null);
  const [reintentando, setReintentando] = React.useState(false);
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [e, d] = await Promise.all([verificacionApi.estado(), documentosApi.listar()]);
      setEstado(e);
      setDocumentos(d);
      onEstado?.(e);
    } catch (err) {
      setError(mensajeDe(err, "No se pudo cargar la verificación."));
      // Fallback seguro: aseguramos que documentos sea un arreglo vacío
      setDocumentos([]);
    } finally {
      setCargando(false);
    }
  }, [onEstado]);

  React.useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subir = async (tipo: TipoDocumento, etiqueta: string, archivo?: File) => {
    if (!archivo) return;
    setSubiendo(tipo);
    try {
      await documentosApi.subir(tipo, archivo);
      toast.success(`${etiqueta} enviado`, {
        description: "Guardamos tu documento de forma privada.",
      });
      setDocumentos(await documentosApi.listar());
    } catch (err) {
      toast.error(`No se pudo subir ${etiqueta}`, { description: mensajeDe(err) });
    } finally {
      setSubiendo(null);
    }
  };

  const reintentar = async () => {
    setReintentando(true);
    try {
      const e = await verificacionApi.reintentar();
      setEstado(e);
      onEstado?.(e);
      toast.success("Consulta enviada al Colegio Odontológico");
    } catch (err) {
      // 429 si pasaron menos de 10 minutos desde el último intento.
      toast.error("No se pudo reintentar", { description: mensajeDe(err) });
    } finally {
      setReintentando(false);
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display text-xl">Documentación</CardTitle>
          {estado && (
            <Badge className={cn("shrink-0", statusStyles[estado.estado])}>
              {estado.estado === "VERIFICADO" && <BadgeCheck className="mr-1 size-3.5" />}
              COP {estado.estado}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Mantén tus documentos vigentes para aparecer como COP verificado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
            {error}
            <Button variant="outline" size="sm" onClick={() => void cargar()}>
              Reintentar
            </Button>
          </div>
        )}
        {!estado && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </p>
        )}
        {estado && (
          <div className="rounded-2xl border border-border bg-background p-4 text-sm">
            <p>{detalleEstado[estado.estado]}</p>
            {estado.nota && (
              <p className="mt-2 rounded-xl bg-warning/10 p-2 text-xs text-warning-foreground">
                Observación: {estado.nota}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Último intento: {fechaHora(estado.ultimo_intento)} · intentos fallidos:{" "}
              {estado.intentos_fallidos}
            </p>
            {estado.estado === "PENDIENTE" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={reintentando}
                onClick={() => void reintentar()}
              >
                {reintentando ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Reintentar ahora
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {TIPOS.map(({ clave, etiqueta, descripcion }) => {
            const subido = documentos.find((d) => d.tipo === clave);
            return (
              <div key={clave} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <p className="font-medium">{etiqueta}</p>
                      <p className="text-xs text-muted-foreground">{descripcion}</p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0",
                      subido ? statusStyles.VERIFICADO : statusStyles.PENDIENTE,
                    )}
                  >
                    {subido ? "SUBIDO" : "FALTA"}
                  </Badge>
                </div>
                {subido && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileCheck2 className="size-3.5" /> Subido {fechaHora(subido.subido_en)}
                    </span>
                    {subido.url_temporal && (
                      <a
                        href={subido.url_temporal}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver <ExternalLink className="size-3" />
                      </a>
                    )}
                  </p>
                )}
                <input
                  ref={(element) => {
                    inputRefs.current[clave] = element;
                  }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => {
                    void subir(clave, etiqueta, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={subiendo !== null}
                  onClick={() => inputRefs.current[clave]?.click()}
                >
                  {subiendo === clave ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : subido ? (
                    <RefreshCw className="mr-2 size-4" />
                  ) : (
                    <Upload className="mr-2 size-4" />
                  )}
                  {subido ? "Reemplazar" : "Subir documento"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          PDF, JPG o PNG de hasta 5 MB. Los enlaces para ver tus archivos duran pocos minutos.
        </p>
      </CardContent>
    </Card>
  );
}
