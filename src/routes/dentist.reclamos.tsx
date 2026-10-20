import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  agendaHoyApi,
  apelacionesApi,
  reclamosApi,
  type Apelacion,
  type Reclamo,
  type ReporteAusencia,
} from "@/lib/api";
import { fechaHora, mensajeDe, soloFecha } from "@/lib/formato";

export const Route = createFileRoute("/dentist/reclamos")({
  head: () => ({ meta: [{ title: "Reclamos y apelaciones | OdontoSystem Odontólogo" }] }),
  component: DentistReclamos,
});

type Pestana = "reclamos" | "apelaciones" | "ausencias";

const area = "w-full rounded-md border border-input bg-background p-2 text-sm";

function DentistReclamos() {
  const [pestana, setPestana] = React.useState<Pestana>("reclamos");
  const [reclamos, setReclamos] = React.useState<Reclamo[]>([]);
  const [apelaciones, setApelaciones] = React.useState<Apelacion[]>([]);
  const [reportes, setReportes] = React.useState<ReporteAusencia[]>([]);
  const [cargando, setCargando] = React.useState(true);
  // Un error por pestaña: si una sección falla, las demás siguen visibles.
  const [errores, setErrores] = React.useState<Partial<Record<Pestana, string>>>({});

  const cargar = React.useCallback(async () => {
    setErrores({});
    const [r, a, p] = await Promise.allSettled([
      reclamosApi.bandeja(),
      apelacionesApi.delOdontologo(),
      agendaHoyApi.reportes(),
    ]);
    const nuevos: Partial<Record<Pestana, string>> = {};
    if (r.status === "fulfilled") setReclamos(r.value);
    else nuevos.reclamos = mensajeDe(r.reason);
    if (a.status === "fulfilled") setApelaciones(a.value);
    else nuevos.apelaciones = mensajeDe(a.reason);
    if (p.status === "fulfilled") setReportes(p.value);
    else nuevos.ausencias = mensajeDe(p.reason);
    setErrores(nuevos);
    setCargando(false);
  }, []);
  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const pendientes = {
    reclamos: reclamos.filter((r) => r.estado === "ABIERTO" || r.estado === "EN_PROCESO").length,
    apelaciones: apelaciones.filter((a) => a.estado === "PENDIENTE").length,
    ausencias: reportes.filter((r) => r.estado === "PENDIENTE").length,
  };

  const pestanas: [Pestana, string][] = [
    ["reclamos", "Reclamos"],
    ["apelaciones", "Apelaciones"],
    ["ausencias", "Reportes de ausencia"],
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-semibold">Reclamos y apelaciones</h1>
        <p className="text-muted-foreground">
          Mientras haya algo pendiente, el depósito de esa cita queda retenido.
        </p>
      </div>

      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {pestanas.map(([clave, etiqueta]) => (
          <Button
            key={clave}
            role="tab"
            aria-selected={pestana === clave}
            variant={pestana === clave ? "default" : "outline"}
            size="sm"
            onClick={() => setPestana(clave)}
          >
            {etiqueta}
            {pendientes[clave] > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendientes[clave]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {errores[pestana] && (
        <p className="mb-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {errores[pestana]}
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </p>
      )}
      {cargando && <Loader2 className="size-5 animate-spin text-muted-foreground" />}

      {!cargando && pestana === "reclamos" && !errores.reclamos && (
        <div className="space-y-4">
          {reclamos.length === 0 && (
            <p className="text-sm text-muted-foreground">No tienes reclamos.</p>
          )}
          {reclamos.map((r) => (
            <TarjetaReclamo key={r.id} reclamo={r} onCambio={cargar} />
          ))}
        </div>
      )}
      {!cargando && pestana === "apelaciones" && !errores.apelaciones && (
        <div className="space-y-4">
          {apelaciones.length === 0 && (
            <p className="text-sm text-muted-foreground">No tienes apelaciones.</p>
          )}
          {apelaciones.map((a) => (
            <TarjetaApelacion key={a.id} apelacion={a} onCambio={cargar} />
          ))}
        </div>
      )}
      {!cargando && pestana === "ausencias" && !errores.ausencias && (
        <div className="space-y-4">
          {reportes.length === 0 && (
            <p className="text-sm text-muted-foreground">Ningún paciente reportó ausencias.</p>
          )}
          {reportes.map((r) => (
            <TarjetaReporte key={r.id} reporte={r} onCambio={cargar} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function TarjetaReclamo({
  reclamo: r,
  onCambio,
}: {
  reclamo: Reclamo;
  onCambio: () => Promise<void>;
}) {
  const [respuesta, setRespuesta] = React.useState("");
  const [resuelto, setResuelto] = React.useState(true);
  const [devolver, setDevolver] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const abierto = r.estado === "ABIERTO" || r.estado === "EN_PROCESO";

  const enviar = async () => {
    setEnviando(true);
    try {
      await reclamosApi.responder(
        r.id,
        respuesta.trim(),
        resuelto,
        r.cita_id ? devolver : undefined,
      );
      toast.success("Respuesta enviada al paciente");
      await onCambio();
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{r.asunto}</p>
          <Badge variant="outline">{r.codigo}</Badge>
          <Badge variant="outline">{r.tipo}</Badge>
          <Badge variant={abierto ? "destructive" : "default"}>{r.estado.replace("_", " ")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {r.reclamante}
          {r.servicio ? ` · ${r.servicio} (${fechaHora(r.fecha_cita)})` : ""} · registrado{" "}
          {fechaHora(r.creado_en)}
          {abierto && ` · responder antes del ${soloFecha(r.responder_antes)}`}
        </p>
        <p className="whitespace-pre-line text-sm">{r.descripcion}</p>
        {r.respuesta && (
          <p className="rounded-lg border border-border/70 p-3 text-sm">
            <span className="font-medium">Tu respuesta: </span>
            {r.respuesta}
          </p>
        )}
        {abierto && (
          <div className="space-y-2">
            <textarea
              className={area}
              rows={3}
              maxLength={4000}
              placeholder="Escribe tu respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resuelto}
                onChange={(e) => setResuelto(e.target.checked)}
              />
              Marcar como resuelto
            </label>
            {r.cita_id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={devolver}
                  onChange={(e) => setDevolver(e.target.checked)}
                />
                Devolver el depósito al paciente
              </label>
            )}
            <Button
              size="sm"
              disabled={enviando || respuesta.trim() === ""}
              onClick={() => void enviar()}
            >
              {enviando && <Loader2 className="mr-2 size-4 animate-spin" />} Responder
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TarjetaApelacion({
  apelacion: a,
  onCambio,
}: {
  apelacion: Apelacion;
  onCambio: () => Promise<void>;
}) {
  const [nota, setNota] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  const resolver = async (aprobar: boolean) => {
    setEnviando(true);
    try {
      await apelacionesApi.resolver(a.id, aprobar, nota);
      toast.success(
        aprobar ? "Apelación aprobada: se devuelve el depósito" : "Apelación rechazada",
      );
      await onCambio();
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{a.paciente}</p>
          <Badge variant={a.estado === "PENDIENTE" ? "destructive" : "outline"}>{a.estado}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {a.servicio} · {fechaHora(a.fecha_cita)} · strikes del paciente:{" "}
          {a.strikes_del_paciente ?? "—"}
        </p>
        {a.certificado_url && (
          <a
            href={a.certificado_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver certificado <ExternalLink className="size-3" />
          </a>
        )}
        {a.nota_resolucion && <p className="text-sm">Nota: {a.nota_resolucion}</p>}
        {a.estado === "PENDIENTE" && (
          <div className="space-y-2">
            <textarea
              className={area}
              rows={2}
              maxLength={500}
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={enviando} onClick={() => void resolver(true)}>
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enviando}
                onClick={() => void resolver(false)}
              >
                Rechazar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aprobar quita un strike al paciente y le devuelve el depósito.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TarjetaReporte({
  reporte: r,
  onCambio,
}: {
  reporte: ReporteAusencia;
  onCambio: () => Promise<void>;
}) {
  const [nota, setNota] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  const responder = async (atendi: boolean) => {
    if (
      !atendi &&
      !window.confirm(
        "Admitir la falta devuelve el depósito al paciente y te suma una falta. ¿Continuar?",
      )
    )
      return;
    setEnviando(true);
    try {
      await agendaHoyApi.responderReporte(r.id, atendi, nota);
      toast.success(atendi ? "Respuesta enviada" : "Falta registrada y depósito devuelto");
      await onCambio();
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{r.paciente}</p>
          <Badge variant={r.estado === "PENDIENTE" ? "destructive" : "outline"}>{r.estado}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {r.servicio} · {fechaHora(r.fecha_cita)}
          {r.distancia_metros !== null && ` · reportó a ${r.distancia_metros} m del consultorio`}
        </p>
        {r.estado === "PENDIENTE" && (
          <p className="text-sm">
            Tienes hasta el {fechaHora(r.responder_antes)} para responder.
            {!r.historia_registrada &&
              " Para decir que lo atendiste, primero registra su historia clínica como prueba."}
          </p>
        )}
        {r.respuesta_odontologo && (
          <p className="text-sm">Tu respuesta: {r.respuesta_odontologo}</p>
        )}
        {r.estado === "PENDIENTE" && (
          <div className="space-y-2">
            <textarea
              className={area}
              rows={2}
              maxLength={2000}
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={enviando || !r.historia_registrada}
                onClick={() => void responder(true)}
              >
                Sí lo atendí
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enviando}
                onClick={() => void responder(false)}
              >
                Admito la falta
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
