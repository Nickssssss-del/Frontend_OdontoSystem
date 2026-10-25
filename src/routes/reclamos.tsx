import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { citasApi, reclamosApi, type Cita, type Reclamo, type TipoReclamo } from "@/lib/api";
import { fechaHora, mensajeDe, soloFecha } from "@/lib/formato";

export const Route = createFileRoute("/reclamos")({
  head: () => ({ meta: [{ title: "Libro de reclamaciones | OdontoSystem" }] }),
  component: Reclamos,
});

const TIPOS: TipoReclamo[] = ["CONSULTA", "INCIDENCIA", "RECLAMO"];

function Reclamos() {
  const [lista, setLista] = React.useState<Reclamo[]>([]);
  const [citas, setCitas] = React.useState<Cita[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);

  const [tipo, setTipo] = React.useState<TipoReclamo>("RECLAMO");
  const [asunto, setAsunto] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [citaId, setCitaId] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  const cargar = React.useCallback(async () => {
    setError(null);
    try {
      const [r, c] = await Promise.all([
        reclamosApi.mios(),
        citasApi.mias().catch(() => [] as Cita[]),
      ]);
      setLista(r);
      setCitas(c);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setCargando(false);
    }
  }, []);
  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    try {
      const r = await reclamosApi.registrar({
        tipo,
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
        ...(citaId ? { cita_id: citaId } : {}),
      });
      toast.success(`Registrado con el código ${r.codigo}. Te enviamos la constancia por correo.`);
      setAsunto("");
      setDescripcion("");
      setCitaId("");
      await cargar();
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = async (r: Reclamo) => {
    try {
      await reclamosApi.cerrar(r.id);
      toast.success("Reclamo cerrado");
      await cargar();
    } catch (e) {
      toast.error(mensajeDe(e));
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Libro de reclamaciones</h1>
        <p className="text-muted-foreground">
          Te respondemos en un máximo de 15 días hábiles. Si es sobre una cita, lo atiende tu
          odontólogo.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Nuevo registro</CardTitle>
          <CardDescription>Consulta, incidencia o reclamo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void enviar(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="r-tipo" className="text-sm font-medium">
                  Tipo
                </label>
                <select
                  id="r-tipo"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoReclamo)}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="r-cita" className="text-sm font-medium">
                  Cita relacionada (opcional)
                </label>
                <select
                  id="r-cita"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={citaId}
                  onChange={(e) => setCitaId(e.target.value)}
                >
                  <option value="">Ninguna</option>
                  {citas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.servicio.titulo} — {c.odontologo.nombre} ({fechaHora(c.inicio)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              required
              maxLength={150}
              placeholder="Asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              aria-label="Asunto"
            />
            <textarea
              required
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              rows={4}
              maxLength={4000}
              placeholder="Cuéntanos qué pasó"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-label="Descripción"
            />
            <Button type="submit" disabled={enviando || !asunto.trim() || !descripcion.trim()}>
              {enviando ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}{" "}
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <p className="mb-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </p>
      )}
      {cargando && <Loader2 className="size-5 animate-spin text-muted-foreground" />}

      <div className="space-y-4">
        {!cargando && lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no registraste nada.</p>
        )}
        {lista.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{r.asunto}</p>
                <Badge variant="outline">{r.codigo}</Badge>
                <Badge variant={r.estado === "RESUELTO" ? "default" : "outline"}>
                  {r.estado.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Atiende:{" "}
                {r.atiende === "ODONTOLOGO"
                  ? (r.odontologo ?? "tu odontólogo")
                  : "soporte de OdontoSystem"}{" "}
                · {fechaHora(r.creado_en)}
                {(r.estado === "ABIERTO" || r.estado === "EN_PROCESO") &&
                  ` · respuesta antes del ${soloFecha(r.responder_antes)}`}
              </p>
              {r.respuesta && (
                <p className="rounded-lg border border-border/70 p-3 text-sm">
                  <span className="font-medium">Respuesta: </span>
                  {r.respuesta}
                </p>
              )}
              {r.estado !== "CERRADO" && (
                <Button variant="outline" size="sm" onClick={() => void cerrar(r)}>
                  Cerrar reclamo
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
